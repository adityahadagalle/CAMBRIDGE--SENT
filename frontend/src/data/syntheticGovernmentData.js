/**
 * Synthetic Organization Transaction Dataset (Demonstration Only)
 * 
 * NOTE: This dataset contains purely synthetic, non-PII, simulated data representing
 * how an organization's existing transaction system can be connected, validated,
 * and mapped into SENTINEL's unified transaction schema.
 * 
 * It does NOT connect to or represent any real government or banking system.
 */

export const TOTAL_DATASET_RECORDS = 5000;

export const SYNTHETIC_DATASET_METADATA = {
  name: "Government_Transaction_Demo_2026",
  source: "Organization Transaction System — Simulated",
  format: "CSV",
  recordCount: TOTAL_DATASET_RECORDS,
  validCount: TOTAL_DATASET_RECORDS,
  invalidCount: 0,
  timeRange: "2026-05-18 08:00:00 UTC — 2026-05-18 19:30:00 UTC",
  accountCount: 1420,
  schemaChecksum: "SHA256:7b4f8c2e91a05d63f1e82b7c4a9d0e1f3a2b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
  averageAmount: "₹ 1,842,500.00",
  channelsCovered: ["PFMS_DBT", "TREASURY_RTGS", "NEFT_GOV", "STATE_DISB_PORTAL"]
};

export const SCHEMA_VALIDATION_CHECKS = [
  { id: "tx_id", label: "Transaction ID detected", status: "pass", detail: "Prefix SYN-TXN-* validated across 5,000 records" },
  { id: "sender", label: "Sender detected", status: "pass", detail: "Originating account identifier verified" },
  { id: "receiver", label: "Receiver detected", status: "pass", detail: "Destination account identifier verified" },
  { id: "amount", label: "Amount detected", status: "pass", detail: "Positive decimal values in standard INR format" },
  { id: "timestamp", label: "Timestamp detected", status: "pass", detail: "Standardized ISO-8601 UTC chronological sequence" },
  { id: "channel", label: "Channel detected", status: "pass", detail: "Valid payment rails (PFMS_DBT, TREASURY_RTGS, NEFT_GOV, STATE_DISB_PORTAL)" }
];

export const FIELD_MAPPINGS = [
  {
    orgField: "transaction_id",
    orgType: "string",
    sentinelField: "tx_id",
    sentinelType: "string",
    description: "Unique transaction identifier normalized to internal canonical key"
  },
  {
    orgField: "source_account",
    orgType: "string",
    sentinelField: "sender_account",
    sentinelType: "string",
    description: "Originating entity account / disbursing authority ID"
  },
  {
    orgField: "destination_account",
    orgType: "string",
    sentinelField: "receiver_account",
    sentinelType: "string",
    description: "Beneficiary or receiving vendor entity account ID"
  },
  {
    orgField: "transaction_amount",
    orgType: "float / numeric",
    sentinelField: "amount",
    sentinelType: "float (INR)",
    description: "Monetary transaction value in standardized currency format"
  },
  {
    orgField: "transaction_time",
    orgType: "datetime string",
    sentinelField: "timestamp",
    sentinelType: "ISO-8601 UTC",
    description: "Timestamp normalized to UTC ISO-8601 standard representation"
  },
  {
    orgField: "payment_channel",
    orgType: "string",
    sentinelField: "channel",
    sentinelType: "string (enum)",
    description: "Payment rail identifier mapped to SENTINEL routing engine"
  }
];

const DEPARTMENTS = [
  { sender: "ACC-TREASURY-CEN-01", raw: "DEPT_FIN_DISB_01", scheme: "Direct Benefit Grant Batch #41", channel: "PFMS_DBT" },
  { sender: "ACC-MIN-INFRA-89", raw: "MIN_HIGHWAYS_DEV", scheme: "Public Works Infrastructure Disbursement", channel: "TREASURY_RTGS" },
  { sender: "ACC-HEALTH-MISSION-14", raw: "HEALTH_DIRECTORATE", scheme: "Public Healthcare Medical Procurement", channel: "NEFT_GOV" },
  { sender: "ACC-RURAL-DEV-07", raw: "RURAL_COMMISSION_OFFICE", scheme: "Rural Development Community Fund", channel: "PFMS_DBT" },
  { sender: "ACC-EDUCATION-SCHOLAR-22", raw: "HE_SCHOLARSHIP_DIR", scheme: "Higher Education Fellowship Allocation", channel: "PFMS_DBT" },
  { sender: "ACC-AGRICULTURE-INPUT-33", raw: "AGRI_SUBSIDY_BUREAU", scheme: "Kisan Seasonal Equipment Subsidy", channel: "STATE_DISB_PORTAL" },
  { sender: "ACC-WATER-SANITATION-09", raw: "WATER_RESOURCE_BOARD", scheme: "Clean Water Infrastructure Milestone #3", channel: "TREASURY_RTGS" },
  { sender: "ACC-DISASTER-RELIEF-03", raw: "RELIEF_CONTINGENCY_FUND", scheme: "Emergency Flood Mitigation Contingency", channel: "TREASURY_RTGS" },
  { sender: "ACC-RENEWABLE-ENERGY-55", raw: "SOLAR_ENERGY_CORP", scheme: "Solar Rooftop Subsidy Settlement", channel: "NEFT_GOV" },
  { sender: "ACC-WOMEN-CHILD-DEV-19", raw: "NUTRITION_MISSION_HQ", scheme: "Early Childhood Nutrition Grant", channel: "PFMS_DBT" },
  { sender: "ACC-URBAN-TRANSPORT-82", raw: "METRO_TRANSIT_AUTHORITY", scheme: "Urban Metro Corridor Phase II", channel: "TREASURY_RTGS" },
  { sender: "ACC-FOOD-SUPPLIES-48", raw: "CIVIL_SUPPLIES_CORP", scheme: "Strategic Grain Buffer Procurement", channel: "STATE_DISB_PORTAL" }
];

const BENEFICIARIES = [
  { receiver: "ACC-STATE-DISB-4412", raw: "STATE_AGENCY_4412" },
  { receiver: "ACC-VENDOR-CIVIL-892", raw: "VEND_INFRA_CORP_892" },
  { receiver: "ACC-MED-SUPPLY-401", raw: "SUPPLIER_PHARMA_401" },
  { receiver: "ACC-PANCHAYAT-POOL-108", raw: "PANCHAYAT_DIST_108" },
  { receiver: "ACC-UNIV-NODAL-630", raw: "UNIV_NODAL_ACC_630" },
  { receiver: "ACC-AGRI-COOP-882", raw: "FARMER_COOP_UNION_882" },
  { receiver: "ACC-PIPELINE-CONTRACT-211", raw: "PIPELINE_ENGINEERING_LTD" },
  { receiver: "ACC-DISTRICT-ADMIN-512", raw: "DISTRICT_MAGISTRATE_512" },
  { receiver: "ACC-GRID-INSTALL-741", raw: "GRID_SOLAR_VEND_741" },
  { receiver: "ACC-CHILD-CARE-CTR-903", raw: "ANGANWADI_CLUSTER_903" },
  { receiver: "ACC-ROLLING-STOCK-301", raw: "RAIL_EQUIP_TECH_301" },
  { receiver: "ACC-GRAIN-STORAGE-119", raw: "WAREHOUSING_AGENCY_119" }
];

export const PAYMENT_METHOD_MAP = {
  'PFMS_DBT': 'UPI',
  'TREASURY_RTGS': 'NEFT',
  'NEFT_GOV': 'NET BANKING',
  'STATE_DISB_PORTAL': 'CARD'
};

/**
 * Generates realistic demonstration transaction amounts tailored to the specific payment method.
 *
 * Demonstration Ranges (not claimed universal statutory limits):
 * - UPI:          ₹500 – ₹1,00,000 (strictly <= ₹1,00,000 for standard general demo transactions)
 * - NEFT:         ₹10,000 – ₹25,00,000 (no RBI-imposed transaction ceiling; realistic higher-value transfers)
 * - NET BANKING:  ₹1,000 – ₹5,00,000 (institution/account profile dependent access rail)
 * - CARD:         ₹500 – ₹2,00,000 (realistic retail/commercial payment card range)
 */
export function generateRealisticAmount(channel, index) {
  const i = Math.max(0, index - 1);
  const method = PAYMENT_METHOD_MAP[channel] || 'UPI';

  switch (method) {
    case 'UPI': {
      // Range: ₹500 to ₹1,00,000 (Strictly <= 100,000)
      const spread = 99500;
      const step = 50;
      const hash = ((i * 7919) + (i % 7) * 313) % spread;
      const rounded = Math.floor(hash / step) * step;
      return Math.min(100000, Math.max(500, 500 + rounded));
    }
    case 'NEFT': {
      // Range: ₹10,000 to ₹25,00,000 (Realistic higher-value transfers)
      const spread = 2490000;
      const step = 1000;
      const hash = ((i * 104729) + (i % 11) * 719) % spread;
      const rounded = Math.floor(hash / step) * step;
      return Math.min(2500000, Math.max(10000, 10000 + rounded));
    }
    case 'NET BANKING': {
      // Range: ₹1,000 to ₹5,00,000 (Account/bank dependent access rail)
      const spread = 499000;
      const step = 500;
      const hash = ((i * 48611) + (i % 13) * 443) % spread;
      const rounded = Math.floor(hash / step) * step;
      return Math.min(500000, Math.max(1000, 1000 + rounded));
    }
    case 'CARD': {
      // Range: ₹500 to ₹2,00,000 (Retail/corporate payment card range)
      const spread = 199500;
      const step = 100;
      const hash = ((i * 32467) + (i % 17) * 521) % spread;
      const rounded = Math.floor(hash / step) * step;
      return Math.min(200000, Math.max(500, 500 + rounded));
    }
    default: {
      return 25000;
    }
  }
}

/**
 * Deterministically generates a single synthetic transaction record for a given index (1 to 5000).
 */
export function getSyntheticTransaction(index) {
  const i = Math.max(0, index - 1);
  const dept = DEPARTMENTS[i % DEPARTMENTS.length];
  const ben = BENEFICIARIES[(i * 7 + 3) % BENEFICIARIES.length];
  const amt = generateRealisticAmount(dept.channel, index);
  const paymentMethod = PAYMENT_METHOD_MAP[dept.channel] || 'UPI';
  
  // Format pseudo-time from 08:00:00 UTC forward across the day
  const baseSeconds = 8 * 3600 + Math.floor((i / TOTAL_DATASET_RECORDS) * (11.5 * 3600));
  const hh = String(Math.floor(baseSeconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((baseSeconds % 3600) / 60)).padStart(2, '0');
  const ss = String(baseSeconds % 60).padStart(2, '0');
  const timeFormatted = `${hh}:${mm}:${ss}`;

  return {
    index: index,
    tx_id: `SYN-TXN-GOV-2026-${String(index).padStart(4, '0')}`,
    raw_tx_id: `ORG_TRX_${String(99200 + index)}`,
    sender_account: dept.sender,
    raw_sender: dept.raw,
    receiver_account: ben.receiver,
    raw_receiver: ben.raw,
    amount: amt,
    timestamp: `2026-05-18 ${timeFormatted} UTC`,
    time: timeFormatted,
    channel: dept.channel,
    payment_method: paymentMethod,
    scheme_tag: dept.scheme,
    status: "NORMALIZED"
  };
}

// Initial preview records (first 12)
export const SYNTHETIC_TRANSACTIONS = Array.from({ length: 12 }, (_, i) => getSyntheticTransaction(i + 1));
