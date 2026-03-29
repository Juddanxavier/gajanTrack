import { getTracking } from 'ts-tracking-number';

const nums = [
  '1Z999AA10123456784', // UPS
  '9400100000000000000000', // USPS
  '774039911111' // FedEx
];

nums.forEach(num => {
  try {
    const result = getTracking(num);
    console.log(`Tracking: ${num}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
  } catch (e) {
    console.log(`Tracking: ${num} - FAILED: ${e.message}`);
  }
});
