import mongoose from 'mongoose'
import 'dotenv/config'
export const DBconnection = async () =>{
  await mongoose.connect(process.env.MONGO_URL)
    .then(()=>{
        console.log('Database Connection is ready...')
      
    })
    .catch((err)=> {
        console.log(err);
    })
}