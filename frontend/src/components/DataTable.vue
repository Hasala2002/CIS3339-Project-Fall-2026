<!-- Reusable table with client side sorting + pagination -->
<template>
  <div>
    <table class="min-w-full shadow-md rounded">
      <thead class="bg-gray-50 text-xl">
        <tr>
          <th v-for="col in columns" :key="col.field" class="p-4 text-left cursor-pointer select-none"
            @click="sortBy(col.field)">
            {{ col.label }}
            <span v-if="sortKey === col.field">{{ sortDir === 1 ? '▲' : '▼' }}</span>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-300">
        <tr v-if="!rows.length">
          <td :colspan="columns.length" class="p-4 text-center text-gray-500">No results</td>
        </tr>
        <tr v-for="row in pageRows" :key="row._id" class="cursor-pointer"
          :class="{ hoverRow: hoverId === row._id }" @mouseenter="hoverId = row._id"
          @mouseleave="hoverId = null" @click="emit('row-click', row)">
          <td v-for="col in columns" :key="col.field" class="p-2 text-left">
            {{ col.render ? col.render(row) : getValue(row, col.field) }}
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="rows.length" class="flex justify-between items-center mt-4">
      <span>Showing {{ start + 1 }}-{{ Math.min(start + pageSize, rows.length) }} of {{ rows.length }}</span>
      <div>
        <button class="mr-2 border border-red-700 text-red-700 rounded disabled:opacity-50" :disabled="page === 1"
          @click="page--">Prev</button>
        <button class="border border-red-700 text-red-700 rounded disabled:opacity-50" :disabled="page === totalPages"
          @click="page++">Next</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// columns: [{ label, field, render? }], rows: plain array of objects
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] }
})
const emit = defineEmits(['row-click'])

const pageSize = 10
const page = ref(1)
const sortKey = ref(null)
// 1 = asc, -1 = desc
const sortDir = ref(1)
const hoverId = ref(null)

// lets fields like 'address.city' work
const getValue = (row, field) => field.split('.').reduce((obj, key) => obj?.[key], row)

// asc -> desc -> off
function sortBy(field) {
  if (sortKey.value !== field) {
    sortKey.value = field
    sortDir.value = 1
  } else if (sortDir.value === 1) {
    sortDir.value = -1
  } else {
    sortKey.value = null
  }
}

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows
  return [...props.rows].sort((a, b) =>
    String(getValue(a, sortKey.value) ?? '').localeCompare(String(getValue(b, sortKey.value) ?? ''), undefined, { numeric: true }) * sortDir.value
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(props.rows.length / pageSize)))
const start = computed(() => (page.value - 1) * pageSize)
const pageRows = computed(() => sortedRows.value.slice(start.value, start.value + pageSize))

// new data (search, clear, etc) always starts back on page 1
watch(() => props.rows, () => { page.value = 1 })
</script>
