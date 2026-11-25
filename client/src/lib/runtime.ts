/** API mode is the default. Browser-only data is available only through an explicit build setting. */
export const API_MODE = import.meta.env.VITE_DATA_MODE !== 'demo'
