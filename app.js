import express from 'express'
const app = express();
import morgan from 'morgan';
import mongoose from 'mongoose';
import cors from 'cors'
import 'dotenv/config'
import authJwt from './src/helpers/jwt'
import errorHandler from './src/helpers/error-handler'
import productsRoutes from './src/routes/products';
import categoryRoutes from './src/routes/categories'
import usersRoutes from './src/routes/users'
import ordersRoutes from './src/routes/orders'
import authRoutes from './src/routes/authRoutes';
import requestRateLimitConfig from './src/config/rateLimit';
import cartRoutes from './src/routes/cartRoutes';
const PORT = process.env.PORT


app.use(cors());
app.options('*', cors())


app.use(express.json());
app.use(morgan('tiny'));
app.use(authJwt());
app.use('/public/uploads', express.static(__dirname + '/public/uploads'));
app.use(errorHandler);
app.use(requestRateLimitConfig)




const api = process.env.API_URL;

app.use(`${api}/categories`, categoryRoutes);
app.use(`${api}/products`, productsRoutes);
app.use(`${api}/users`, usersRoutes);
app.use(`${api}/auth`, authRoutes);
app.use(`${api}/orders`, ordersRoutes);
app.use(`${api}/cart`, cartRoutes);


mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'KarrykelyDB'
})
.then(()=>{
    console.log('Database Connection is ready...')
    app.listen(PORT, ()=>{

        console.log(`server is running on port ${PORT}`);
    })
})
.catch((err)=> {
    console.log(err);
})


