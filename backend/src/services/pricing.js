const CPU_SURCHARGE_PER_HOUR = {
  "AMD Ryzen 9 9950X": 20,
  "Intel Xeon Platinum 8480+": 0
};

const RAM_TIERS = [
  { label: "512MB", mb: 512, costPerHour: 0.01 },
  { label: "1GB", mb: 1024, costPerHour: 0.05 },
  { label: "2GB", mb: 2048, costPerHour: 0.1 },
  { label: "4GB", mb: 4096, costPerHour: 0.15 },
  { label: "8GB", mb: 8192, costPerHour: 0.2 },
  { label: "16GB", mb: 16384, costPerHour: 0.3 },
  { label: "32GB", mb: 32768, costPerHour: 0.8 }
];

const OS_OPTIONS = ["Debian 11", "Debian 12", "Ubuntu 24.04", "Ubuntu 22.04", "Ubuntu 20.04"];
const CPU_OPTIONS = Object.keys(CPU_SURCHARGE_PER_HOUR);

function ramTierByLabel(label) {
  return RAM_TIERS.find((t) => t.label === label);
}

function computeHourlyCost({ cpu, ramLabel }) {
  const tier = ramTierByLabel(ramLabel);
  if (!tier) throw new Error("Invalid RAM tier");
  const cpuSurcharge = CPU_SURCHARGE_PER_HOUR[cpu];
  if (cpuSurcharge === undefined) throw new Error("Invalid CPU option");
  return Number((tier.costPerHour + cpuSurcharge).toFixed(4));
}

module.exports = {
  CPU_SURCHARGE_PER_HOUR,
  RAM_TIERS,
  OS_OPTIONS,
  CPU_OPTIONS,
  ramTierByLabel,
  computeHourlyCost
};
