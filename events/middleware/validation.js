module.exports = validator => {
  return (req, res, next) => {
    if (req.method === 'POST') {
      const { error } = validator(req.body, true);
      if (error) return res.status(400).send(error.details[0].message);
    } else {
      const { error } = validator(req.body);
      if (error) return res.status(400).send(error.details[0].message);
    }
    next();
  };
};
