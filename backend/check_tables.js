const path = require('path');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'app_data', 'database.sqlite'),
    logging: false
});

async function checkTables() {
    try {
        const tables = await sequelize.getQueryInterface().showAllSchemas();
        console.log('Tables:', tables);
    } catch (e) {
        console.error(e);
    }
}

checkTables();
