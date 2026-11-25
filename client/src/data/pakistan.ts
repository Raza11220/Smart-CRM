/** Fictional organizations and contacts. Every email uses the reserved .example domain. */
export const locations = [
  { city: 'Lahore', province: 'Punjab', district: 'Gulberg III' },
  { city: 'Karachi', province: 'Sindh', district: 'Shahrah-e-Faisal' },
  { city: 'Islamabad', province: 'Islamabad Capital Territory', district: 'I-8 Markaz' },
  { city: 'Rawalpindi', province: 'Punjab', district: 'Satellite Town' },
  { city: 'Faisalabad', province: 'Punjab', district: 'Madina Town' },
  { city: 'Multan', province: 'Punjab', district: 'Gulgasht Colony' },
  { city: 'Sialkot', province: 'Punjab', district: 'Paris Road' },
  { city: 'Gujranwala', province: 'Punjab', district: 'Satellite Town' },
  { city: 'Peshawar', province: 'Khyber Pakhtunkhwa', district: 'University Town' },
  { city: 'Quetta', province: 'Balochistan', district: 'Jinnah Road' },
  { city: 'Hyderabad', province: 'Sindh', district: 'Latifabad' },
] as const

export const companies = [
  'Lahore Tech Solutions', 'Karachi Digital Hub', 'Islamabad IT Services', 'PakGrowth Marketing',
  'NexaSoft Pakistan', 'Punjab Textile Traders', 'BluePeak Technologies', 'Crescent Business Solutions',
  'Falcon Logistics', 'PakVista Enterprises', 'Capital Software House', 'Indus Commerce Solutions',
  'Ravi Industrial Supplies', 'Mehran Digital Systems', 'Margalla Business Technologies', 'Potohar Distribution',
  'Chenab Textile Solutions', 'Multan AgriTech Services', 'Sialkot Export Partners', 'Gujranwala Engineering Works',
  'Khyber Commerce Group', 'Bolan Supply Chain', 'Sindh Retail Systems', 'Lahore Packaging Partners',
  'Karachi Maritime Software', 'Capital Health Systems', 'Punjab Cold Storage Solutions', 'Indus Food Distribution',
  'Ravi E-Commerce Studio', 'Mehran Business Analytics', 'Margalla Cloud Services', 'Potohar Office Solutions',
  'Chenab Manufacturing Systems', 'Multan Solar Services', 'Sialkot Sportswear Traders', 'Gujranwala Trade Network',
  'Khyber Learning Technologies', 'Bolan Resource Solutions', 'Hyderabad Wholesale Systems', 'PakReach Consulting',
] as const

export const contactNames = [
  'Muhammad Ahmed', 'Ayesha Khan', 'Ali Raza', 'Fatima Zahra', 'Abdul Rehman', 'Maryam Ahmed',
  'Hassan Khan', 'Hira Aslam', 'Usman Tariq', 'Sana Javed', 'Bilal Ahmed', 'Zainab Malik',
  'Hamza Malik', 'Mahnoor Ali', 'Fahad Iqbal', 'Iqra Yousaf', 'Omar Farooq', 'Amna Shahid',
  'Saad Mahmood', 'Hafsa Khalid', 'Danish Rauf', 'Sadia Anwar', 'Imran Siddiqui', 'Rabia Nadeem',
  'Kashif Saleem', 'Maham Riaz', 'Waqas Ashraf', 'Anum Faisal', 'Adnan Qureshi', 'Laiba Hassan',
  'Shahzaib Akram', 'Areeba Masood', 'Talha Nisar', 'Nimra Sohail', 'Faisal Nawaz', 'Bushra Wasim',
  'Adeel Mustafa', 'Komal Akhtar', 'Shayan Naeem', 'Muneeba Jamil', 'Salman Javed', 'Tooba Asif',
  'Rizwan Haider', 'Eman Zahid', 'Kamran Latif', 'Saman Ejaz', 'Yasir Bashir', 'Kinza Ashfaq',
  'Noman Arshad', 'Fiza Aftab',
] as const

export const team = [
  { name: 'Ahmed Faraz', jobTitle: 'Sales Manager', department: 'Sales', city: 'Lahore' },
  { name: 'Ayesha Siddiqui', jobTitle: 'Sales Executive', department: 'Sales', city: 'Karachi' },
  { name: 'Hassan Sheikh', jobTitle: 'Business Development Officer', department: 'Business Development', city: 'Islamabad' },
  { name: 'Fatima Noor', jobTitle: 'CRM Administrator', department: 'Revenue Operations', city: 'Lahore' },
  { name: 'Usman Qadir', jobTitle: 'Customer Relationship Manager', department: 'Customer Success', city: 'Rawalpindi' },
  { name: 'Maryam Saeed', jobTitle: 'Sales Team Lead', department: 'Sales', city: 'Faisalabad' },
  { name: 'Bilal Zafar', jobTitle: 'Sales Executive', department: 'Sales', city: 'Multan' },
  { name: 'Hira Mahmood', jobTitle: 'Business Development Officer', department: 'Business Development', city: 'Sialkot' },
  { name: 'Hamza Waheed', jobTitle: 'Customer Relationship Manager', department: 'Customer Success', city: 'Peshawar' },
  { name: 'Sana Iftikhar', jobTitle: 'Sales Executive', department: 'Sales', city: 'Quetta' },
  { name: 'Fahad Mansoor', jobTitle: 'Business Development Officer', department: 'Business Development', city: 'Gujranwala' },
  { name: 'Zainab Rashid', jobTitle: 'Sales Executive', department: 'Sales', city: 'Hyderabad' },
] as const

export const services = [
  { name: 'Website development', value: 250000, note: 'A bilingual corporate website with an editable product catalogue and enquiry forms.' },
  { name: 'ERP implementation', value: 3500000, note: 'Inventory, procurement, and finance workflows across the regional offices.' },
  { name: 'CRM subscription', value: 150000, note: 'An annual sales-team subscription with contact migration and onboarding.' },
  { name: 'Mobile app development', value: 1250000, note: 'An Android and iOS customer app with order tracking and account management.' },
  { name: 'Digital marketing', value: 450000, note: 'A quarterly B2B acquisition programme with paid campaigns and monthly reporting.' },
  { name: 'Cloud infrastructure', value: 1800000, note: 'Managed cloud hosting, database backups, and disaster recovery configuration.' },
  { name: 'E-commerce development', value: 850000, note: 'An online storefront with inventory integration, local payments, and courier workflows.' },
  { name: 'Software maintenance', value: 300000, note: 'Annual application support, security updates, and a quarterly service review.' },
] as const

export const companySlug = (company: string) => company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
// Synthetic demo numbers, not verified or dialable contact records.
export function demoPhone(index: number, international = false) {
  const prefix = `3${String(10 + index % 39).padStart(2, '0')}`
  const subscriber = String(1000000 + index * 7919).padStart(7, '0')
  return international ? `+92 ${prefix} ${subscriber}` : `0${prefix}-${subscriber}`
}
