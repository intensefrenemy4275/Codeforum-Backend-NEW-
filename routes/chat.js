const express = require('express');
const router = express.Router();
const isAuth = require('../middleware/is-auth');
const User = require('../models/user');

// GET /chat/mutual-followers
router.get('/mutual-followers', isAuth, async (req, res) => {
  const user = req.user;
  const mutual = user.progress.following.filter(f => 
    user.progress.followers.map(String).includes(String(f))
  );
  const users = await User.find({ _id: { $in: mutual } }, 'username name profilePic');
  res.json({ mutualFollowers: users });
});
module.exports = router;
