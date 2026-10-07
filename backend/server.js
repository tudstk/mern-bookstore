require('dotenv').config({quiet: true});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim());

const PRODUCTS_FILE = path.join(__dirname,'data' ,'books.json');

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(compression());
app.use(express.json());
if(process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

const readCatalog = () => {
    try {
        const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
        const parsed = JSON.parse(data);
        return { products: parsed.products || [], metadata: parsed.metadata || {}};
    }
    catch (error){
        console.error('Eroare la citirea catalogului:', error.message);
        return { products: [], metadata: {}};
    }
}

const readProducts = () => readCatalog().products;

const saveProducts = (products) => {
    const { metadata } = readCatalog();
    const now = new Date().toISOString();
    const data = {
        products,
        metadata: {...metadata, totalProducts: products.length, lastUpdated: now
        },
    };
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2));
};

app.get('/api/products', (req, res) => {
    const { category } = req.query;
    let products = readProducts().filter((p) => p.isActive === true);

    if (category) {
        products = products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    
    res.json({
        success: true,
        products,
        total: products.length,
        filters: { category: category || null },
    })
});

app.get('/api/products/:id', (req, res) => {
    const id = Number(req.params.id);

    if(!Number.isInteger(id) || id <= 0){
        return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const product = readProducts().find((p) => p.id === id && p.isActive === true);

    if(!product){
        return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
})

const apiInfo = (req, res) => {
    res.json({
        message: 'MERN BookStore API v1',
        descrition: 'API pentru catalogul de carti',
        version: '1.0.0',
        endpoints: {
            'GET /api/products': 'Returneaza lista de produse, cu posibilitatea de filtrare dupa categorie',
            'GET /api/products?category=React' :'Filtreaza produsele dupa categorie (ex: React, JavaScript, Node.js)',
            'GET /api/products/:id': 'Returneaza detaliile unui produs dupa ID',
        },
    });
}

app.use((req, res) => {
    res.status(404).json({ success: false, message: `Ruta ${req.method} ${req.originalUrl} nu exista`
    });
});

app.use((err, req, res, next) => {
    if(err.type === 'entity.parse.failed'){
        return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
    }
    console.error('Eroare server:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
})

if(process.env.NODE_ENV !== 'test'){
    app.listen(PORT, () => {
        console.log(`\nMERN BookStore API v1)`);
        console.log(`Serverul ruleaza pe: http://localhost:${PORT}`);
        console.log(`Produse: http://localhost:${PORT}/api/products\n`);
    })}

module.exports = app;