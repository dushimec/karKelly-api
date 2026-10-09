

export const notFound = (req, res, next) => {
    const error = new Error(`Not Found: ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || err.status || (res.statusCode !== 200 ? res.statusCode : 500);
    if (statusCode >= 500) {
        console.error("Unhandled API error:", err);
    }
    res.status(statusCode).json({
        success: false,
        message: statusCode < 500 ? err.message : "Internal server error",
    });
};