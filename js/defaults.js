export const FONT_FAMILY = "'Source Sans Pro', 'Open Sans', sans-serif";
export const FONT = {family: FONT_FAMILY};
export const MARGIN = {l: 60, r: 30, t: 40, b: 50};
export const PLOT_CONFIG = {displaylogo: false};
// Sane thresholds on absurd outliers
export const MAX_CO2I_FROM_HEAT = 1000; // tons/MWh
export const MAX_CO2I_FROM_GEN = 3 * MAX_CO2I_FROM_HEAT;
export const MAX_SO2I_FROM_GEN = 15; // lbs/MWh
