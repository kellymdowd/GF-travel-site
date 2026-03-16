const XLSX = require("xlsx");
const wb = XLSX.readFile("travel_master.xlsx");
const ws = wb.Sheets["places"];
const data = XLSX.utils.sheet_to_json(ws);
const tokyo = data.filter(r => r.city && r.city.toLowerCase().includes("tokyo") && r.latitude && r.longitude);

const places = tokyo.map(r => ({
  name: r.place_name,
  type: r.place_type || "other",
  lat: parseFloat(r.latitude),
  lng: parseFloat(r.longitude),
  month: r.visit_month,
  year: r.visit_year
}));

console.log(JSON.stringify({ 
  count: places.length,
  months: [...new Set(places.map(p => `${p.month} ${p.year}`))],
  places 
}, null, 2));
