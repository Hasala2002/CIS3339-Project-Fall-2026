// This file contains API endpoints for interacting with the "services" collection of the MongoDB database
const express = require('express');
const router = express.Router();

// import services schema
const { services, events } = require('../models/models');

// Middleware for authorization. requireAuth checks the token, requireRole('editor') blocks viewers from changing data.
const { requireAuth, requireRole } = require('../auth/authMiddleWare');
const { withOrg, stripOrg, escapeRegex } = require('../helpers');

// API endpoint to all services for org
router.get('/', requireAuth, (req, res, next) => {
  services
    .find(withOrg({}, req), (error, data) => {
      if (error) {
        return next(error);
      } else {
        res.json(data);
      }
    })
    .sort({ updatedAt: -1 });
});

// API endpoint to GET single service by ID
router.get('/id/:id', requireAuth, (req, res, next) => {
  services.findOne(withOrg({ _id: req.params.id }, req), (error, data) => {
    if (error) {
      return next(error);
    } else if (!data) {
      res.status(400).send('Service not found');
    } else {
      res.json(data);
    }
  });
});

// API endpoint to GET entries based on search query
router.get('/search', requireAuth, (req, res, next) => {
  const dbQuery = withOrg({}, req);
  switch (req.query.searchBy) {
    case 'name':
      dbQuery.name = { $regex: escapeRegex(req.query.name), $options: "i" };
      break;
    case 'description':
      dbQuery.description = {
        $regex: escapeRegex(req.query.description),
        $options: "i",
      };
      break;
    default:
      return res.status(400).send('invalid searchBy');
  }
  services.find(dbQuery, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

// API endpoint to POST new service
router.post('/', requireAuth, requireRole('editor'), (req, res, next) => {
  const newService = stripOrg(req.body);
  newService.org = req.user.orgId;
  services.create(newService, (error, data) => {
    if (error) {
      return next(error);
    } else {
      return res.status(200).send('New service created successfully');
    }
  });
});

// API endpoint to PUT -> update service
router.put('/update/:id', requireAuth, requireRole('editor'), (req, res, next) => {
  services.findOneAndUpdate(withOrg({ _id: req.params.id }, req), stripOrg(req.body), (error, data) => {
    if (error) {
      return next(error);
    } else {
      if (!data)
        res.status(400).send("Service not found.")
      else
        res.status(201).send('Service updated successfully');
    }
  });
});

// API endpoint to hard DELETE event by ID
router.delete('/:id', requireAuth, requireRole('editor'), async (req, res, next) => {
  // only delete service if no events are using that service
  const serviceEvents = await events.find(withOrg({ services: req.params.id }, req))

  if (serviceEvents.length !== 0) {
    res
        .status(400)
        .send('Service can not be deleted since it is being used by events.');
    return;
  }

  services.findOne(withOrg({ _id: req.params.id }, req), (error, data) => {
    if (error) {
      return next(error);
    } else if (!data) {
      res.status(400).send('Service not found');
    } else {
      services.findOneAndDelete(
        withOrg({ _id: req.params.id }, req),
        (error, data) => {
          if (error) {
            return next(error);
          } else if (!data) {
            res.status(400).send('Service not found');
          } else {
            res.status(200).send('Service deleted successfully');
          }
        }
      );
    }
  });
});

module.exports = router;
