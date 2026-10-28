<!-- This is the home view - which shows a dashboard -->
<template>
  <main>
    <div>
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        Dashboard
      </h1>
      <br />
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div class="ml-10"></div>
        <div class="flex flex-col col-span-2">
          <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
              Events Attendance
          </h1>
      
          <p v-if="loading" class="flex justify-center mt-10 text-gray-500 animate-pulse">Loading attendance...</p>
          <div v-else-if="error" class="mt-10 p-4 bg-red-50 text-red-900">
            <p class="font-bold">Couldn't load attendance: {{ error }}</p>
            <button class="mt-2 bg-red-700 text-white rounded" @click="loadAttendance()">Retry</button>
          </div>
          <div v-else-if="!recentEvents.length" class="flex justify-center mt-10">No events found.</div>
          <table v-if="recentEvents.length" class="min-w-full shadow-md rounded">
            <thead class="bg-gray-50 text-xl">
              <tr class="p-4 text-left">
                <th class="p-4 text-left">Event Name</th>
                <th class="p-4 text-left">Event Date</th>
                <th class="p-4 text-left">Number of Attendees</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-300"> 
              <tr
                v-for="event in recentEvents"
                :key="event._id"
              >
                <td class="p-2 text-left">{{ event.name }}</td>
                <td class="p-2 text-left">{{ formatDate(event.date) }}</td>
                <td class="p-2 text-left">{{ event.attendees.length }}</td>
              </tr>
            </tbody>
          </table>
          
          <div v-if="recentEvents.length">
            <AttendanceChart :label="labels" :chart-data="chartData"></AttendanceChart>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div class="ml-10"></div>
        <div class="flex flex-col col-span-2">
          <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
              Clients by Zip Code
          </h1>
          
          <p v-if="zipLoading" class="flex justify-center mt-10 text-gray-500 animate-pulse">Loading zip codes...</p>
          <div v-else-if="zipError" class="mt-10 p-4 bg-red-50 text-red-900">
            <p class="font-bold">Couldn't load clients by zip: {{ zipError }}</p>
            <button class="mt-2 bg-red-700 text-white rounded" @click="loadZips()">Retry</button>
          </div>
          <div v-else-if="!zips.length" class="flex justify-center mt-10">No clients found.</div>
          <table v-if="zips.length" class="min-w-full shadow-md rounded">
            <thead class="bg-gray-50 text-xl">
              <tr class="p-4 text-left">
                <th class="p-4 text-left">Zip Number</th>
                <th class="p-4 text-left">Client Count</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-300">
              <tr
                v-for="zip in zips"
                :key="zip._id"
              >
                <td class="p-2 text-left">{{ zip._id }}</td>
                <td class="p-2 text-left">{{ zip.count }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="zips.length" class="flex justify-center mt-10">
            <ZipChart :label="zipLabels" :chart-data="zipChartData"></ZipChart>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import AttendanceChart from '../components/barChart.vue'
import ZipChart from '../components/donutZipChart.vue'
import { getAttendance, getClientsByZipCode } from '../api/api'
import { useApi } from '../composables/useApi'

const { data: attendance, loading, error, execute: loadAttendance } = useApi(() => getAttendance())
const { data: zipData, loading: zipLoading, error: zipError, execute: loadZips } = useApi(() => getClientsByZipCode())

// method called to format the event date
function formatDate(date) {
  const isoDate = new Date(date);
  const year = isoDate.getUTCFullYear();
  const month = String(isoDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(isoDate.getUTCDate()).padStart(2, '0');
  return `${month}/${day}/${year}`;
}

// chart data gets built off whatever the api returned
const recentEvents = computed(() => attendance.value || [])
const labels = computed(() => recentEvents.value.map((item) => `${item.name} (${formatDate(item.date)})`))
const chartData = computed(() => recentEvents.value.map((item) => item.attendees.length))

const zips = computed(() => zipData.value || [])
const zipLabels = computed(() => zips.value.map((item) => item._id))
const zipChartData = computed(() => zips.value.map((item) => item.count))

onMounted(() => {
  loadAttendance()
  loadZips()
})
</script>
