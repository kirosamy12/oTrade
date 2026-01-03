import { register, login } from './auth.service.js';
import { handleResponse, handleError } from '../../utils/response.js';

const registerController = async (req, res) => {
  try {
    const result = await register(req.body);
    handleResponse(res, 201, result);
  } catch (error) {
    handleError(res, 400, error.message);
  }
};

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    handleResponse(res, 200, result);
  } catch (error) {
    handleError(res, 401, error.message);
  }
};

export { registerController as register, loginController as login };