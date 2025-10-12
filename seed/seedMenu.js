require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../models/menuItem');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const menuItems = [
  { name: 'Classic Caesar Salad', price: 8.99, description: 'Crisp romaine, parmesan, croutons, creamy dressing.' },
  { name: 'Greek Salad', price: 9.49, description: 'Feta cheese, kalamata olives, tomatoes, cucumbers, red onion.' },
  { name: 'Quinoa Power Bowl', price: 10.99, description: 'Quinoa, avocado, chickpeas, mixed greens, lemon-tahini dressing.' },
];

async function seedMenu() {
  try {
    await MenuItem.deleteMany({});
    await MenuItem.insertMany(menuItems);
    console.log('✅ Menu items seeded successfully');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedMenu();
