import rateLimit from 'express-rate-limit'

const requestRateLimitConfig = rateLimit({
    windowMs:process.env.WINDOW_MS,
    max:process.env.MAX_REQUEST_PER_MINS,
    handler:(req,res)=>{
        res.status(429).json({
            message:'Too many request from this api, please try again after 1 minute'
        })
    }
})
export default requestRateLimitConfig;