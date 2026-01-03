const handleResponse = (res, statusCode, data) => {
  res.status(statusCode).json(data);
};

const handleError = (res, statusCode, message) => {
  res.status(statusCode).json({ error: message });
};

export { handleResponse, handleError };