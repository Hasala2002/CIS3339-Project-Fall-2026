// This file contains API endpoints for interacting with the "events" collection in the MongoDB database
const express = require("express");
const router = express.Router();

// Middleware for authorization. requireAuth checks the token, requireRole('editor') blocks viewers from changing data.
const { requireAuth, requireRole } = require("../auth/authMiddleWare");
const { withOrg, stripOrg, escapeRegex } = require("../helpers");

// importing data model schemas
const { events, clients } = require("../models/models");

// API endpoint to get all events for org
router.get("/", requireAuth, (req, res, next) => {
  events
    .find(withOrg({}, req), (error, data) => {
      if (error) {
        return next(error);
      } else {
        return res.json(data);
      }
    })
    // sort by date descending
    .sort({ date: -1 });
});

// API endpoint to GET single event by ID
router.get("/id/:id", requireAuth, (req, res, next) => {
  events.findOne(withOrg({ _id: req.params.id }, req), (error, data) => {
    if (error) {
      return next(error);
    } else if (!data) {
      res.status(400).send("Event not found");
    } else {
      res.json(data);
    }
  });
});

// API endpoint to GET events based on search query
// Ex: '...?name=Food&searchBy=name'
router.get("/search/", requireAuth, (req, res, next) => {
  const dbQuery = withOrg({}, req);
  switch (req.query.searchBy) {
    case "name":
      dbQuery.name = { $regex: escapeRegex(req.query.name), $options: "i" };
      break;
    case "date":
      dbQuery.date = req.query.eventDate;
      break;
    default:
      return res.status(400).send("invalid searchBy");
  }
  events.find(dbQuery, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

// API endpoint to GET events for which a client is signed up
router.get("/client/:id", requireAuth, (req, res, next) => {
  events.find(withOrg({ attendees: req.params.id }, req), (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

// API endpoint to GET events for which a client is not signed up
router.get(
  "/client/:id/not-registered",
  requireAuth,
  async (req, res, next) => {
    try {
      const eventsNotRegistered = await events.find(
        withOrg({ attendees: { $nin: [req.params.id] } }, req)
      );
      res.json(eventsNotRegistered);
    } catch (error) {
      next(error);
    }
  }
);

// API endpoint to GET attendee details for an event
router.get("/attendees/:id", requireAuth, (req, res, next) => {
  events.findOne(withOrg({ _id: req.params.id }, req), (error, event) => {
    if (error) {
      return next(error);
    } else {
      if (!event)
        res.status(400).send("Event not found")
      else {
        const attendeeIds = event.attendees.map((attendee) =>
          attendee.toString()
        );
        clients.find(withOrg({ _id: { $in: attendeeIds } }, req, "orgs"), (error, clients) => {
          if (error) {
            return next(error);
          } else {
            res.json(clients);
          }
        });
      }
    };
  });
});

// API endpoint to GET all events for a given service
router.get("/service/:id", requireAuth, async (req, res, next) => {
  try {
    const eventsWithService = await events
      .find(withOrg({ services: { $in: [req.params.id] } }, req))
      .select({ _id: 1, name: 1, date: 1, address: { line1: 1 } })
      .lean();
    res.json(eventsWithService);
  } catch (error) {
    next(error);
  }
});

// API endpoint to POST new event
router.post("/", requireAuth, requireRole("editor"), (req, res, next) => {
  const newEvent = stripOrg(req.body);
  newEvent.org = req.user.orgId;
  events.create(newEvent, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.status(200).send("New event created successfully");
    }
  });
});

// API endpoint to PUT -> update event
router.put("/update/:id", requireAuth, requireRole("editor"), (req, res, next) => {
  events.findOneAndUpdate(
    withOrg({ _id: req.params.id }, req),
    stripOrg(req.body),
    (error, data) => {
      if (error) {
        return next(error);
      } else {
        res.status(200).send("Event updated successfully");
      }
    }
  );
});

// both the event and the client have to exist in the user's org, otherwise register/deregister send a 404
const findBoth = (req) =>
  Promise.all([
    events.findOne(withOrg({ _id: req.query.event }, req)),
    clients.findOne(withOrg({ _id: req.query.client }, req, "orgs")),
  ]);

// API endpoint to PUT -> add attendee to event
router.put("/register", requireAuth, requireRole("editor"), async (req, res, next) => {
  try {
    const { event, client } = req.query;
    const [foundEvent, foundClient] = await findBoth(req);
    if (!foundEvent || !foundClient) {
      return res.status(404).json({ error: !foundEvent ? "Event not found" : "Client not found" });
    }
    // the filter skips events that already have this client, so two quick calls can't make a duplicate
    const added = await events.findOneAndUpdate(
      withOrg({ _id: event, attendees: { $ne: client } }, req),
      { $addToSet: { attendees: client } }
    );
    if (!added) return res.json({ message: "Already registered" });
    res.json({ event, client });
  } catch (error) {
    next(error);
  }
});

// API endpoint to PUT -> remove attendee from event
router.put("/deregister", requireAuth, requireRole("editor"), async (req, res, next) => {
  try {
    const { event, client } = req.query;
    const [foundEvent, foundClient] = await findBoth(req);
    if (!foundEvent || !foundClient) {
      return res.status(404).json({ error: !foundEvent ? "Event not found" : "Client not found" });
    }
    const removed = await events.findOneAndUpdate(
      withOrg({ _id: event, attendees: client }, req),
      { $pull: { attendees: client } }
    );
    if (!removed) return res.json({ message: "Not registered" });
    res.json({ event, client });
  } catch (error) {
    next(error);
  }
});

// API endpoint to hard DELETE event by ID
router.delete("/:id", requireAuth, requireRole("editor"), (req, res, next) => {
  events.findOne(withOrg({ _id: req.params.id }, req), (error, data) => {
    if (error) {
      return next(error);
    } else if (!data) {
      res.status(400).send("Event not found");
    } else {
      // only delete event if no clients are signed up
      if (data.attendees.length === 0) {
        events.findOneAndDelete(
          withOrg({ _id: req.params.id }, req),
          (error, data) => {
            if (error) {
              return next(error);
            } else if (!data) {
              res.status(400).send("Event not found");
            } else {
              res.status(200).send("Event deleted successfully");
            }
          }
        );
      } else {
        res.status(400).send("Event has attendees and can't be deleted.");
      }
    }
  });
});

// GET event attendance for the past two months for dashboard
router.get("/attendance", requireAuth, (req, res, next) => {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  events
    .find(withOrg({ date: { $gte: twoMonthsAgo } }, req), (error, data) => {
      if (error) {
        return next(error);
      } else {
        res.json(data);
      }
    })
    .sort({ date: 1 });
});

module.exports = router;
