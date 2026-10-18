const supabase = require('../config/supabase');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = { ...user, profile };
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Internal authentication error' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.profile || !roles.includes(req.user.profile.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

module.exports = { authenticateUser, requireRole };