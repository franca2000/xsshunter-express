module.exports = {
  domain: "xsshunter-express-7f8o.onrender.com", // tu dominio real sin https
  httpPort: process.env.PORT || 3000,
  useHTTPS: false, // desactivamos HTTPS interno, porque Render ya lo maneja
  maintainerEmail: "francisco@ejemplo.com", // cualquier email, solo para evitar el error
  enableLogging: true
};
