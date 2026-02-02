// Konfiguracja aplikacji

export const BASE_PATH = import.meta.env.VITE_BASE_PATH || '/vtt/room1/'
export const API_PATH = import.meta.env.VITE_API_PATH || '/api.php'
export const API_BASE = `${BASE_PATH}${API_PATH}`

export const GRID_SIZE = 128
export const CELL_SIZE = 64

// L5R
export const ENABLE_L5R = import.meta.env.VITE_ENABLE_L5R === 'true'