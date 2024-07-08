import mongoose from 'mongoose'
import 'dotenv/config'
export const DBconnection = async () =>{
  await mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true ,
        dbName: 'KarrykelyDB'
    })
    .then(()=>{
        console.log('Database Connection is ready...')
      
    })
    .catch((err)=> {
        console.log(err);
    })
}