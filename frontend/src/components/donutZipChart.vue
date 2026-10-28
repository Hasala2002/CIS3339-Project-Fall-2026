<template>
  <div class="w-1/2">
    <canvas class="p-10" ref="zipChart"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)
//define props (label and chartData)
const props = defineProps({
  label: {
    type: Array
  },
  chartData: {
    type: Array
  }
})

const zipChart = ref(null)

onMounted(() => { //uses the data to load the chart's values
  new Chart(zipChart.value, {
      type: 'doughnut',
      data: {
        labels: props.label,
        datasets: [
          {
            borderWidth: 1,
            data: props.chartData
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Clients by Zip Code'
          }
        },
        responsive: true,
        maintainAspectRatio: true
      }
    })
})
</script>
