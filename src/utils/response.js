const handleResponse = (res, statusCode, data) => {
  res.status(statusCode).json(data);
};

const handleError = (res, statusCode, message) => {
  res.status(statusCode).json({ error: message });
};

const sendSuccessResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
    ...(data !== null && { data })
  };
  res.status(statusCode).json(response);
};

const sendErrorResponse = (res, statusCode, message, details = null) => {
  const response = {
    success: false,
    message,
    ...(details && { details })
  };
  res.status(statusCode).json(response);
};

export { handleResponse, handleError, sendSuccessResponse, sendErrorResponse };