const bluebird = require('bluebird');
const crypto = bluebird.promisifyAll(require('crypto'));
const nodemailer = require('nodemailer');
const passport = require('passport');
const User = require('../models/User');
const Map = require('../models/Map');

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/login', {
    title: 'Login'
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password cannot be blank').notEmpty();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('errors', info);
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Success! You are logged in.' });
      res.redirect(req.session.returnTo || '/');
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
  req.logout();
  res.redirect('/');
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/signup', {
    title: 'Create Account'
  });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/signup');
  }

  const user = new User({
    email: req.body.email,
    password: req.body.password
  });

  User.findOne({ email: req.body.email }, (err, existingUser) => {
    if (err) { return next(err); }
    if (existingUser) {
      req.flash('errors', { msg: 'Account with that email address already exists.' });
      return res.redirect('/signup');
    }
    user.save((err) => {
      if (err) { return next(err); }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        req.flash('success', { msg: 'Welcome to Invarient!  You are now logged in.'});
        res.redirect('/');
      });
    });
  });
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {

  if (req.isAuthenticated()) {
    res.render('account/profile', {
      title: 'Account Management',
      headerType: 'logged'
    });
  }
  else {
    res.render('login', {
      title: 'Account Management',
      headerType: 'notLogged'
    });
  }

};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.email = req.body.email || '';
    user.profile.name = req.body.name || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';
    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', { msg: 'The email address you have entered is already associated with an account.' });
          return res.redirect('/account');
        }
        return next(err);
      }
      req.flash('success', { msg: 'Profile information has been updated.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.password = req.body.password;
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Password has been changed.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
  User.remove({ _id: req.user.id }, (err) => {
    if (err) { return next(err); }
    req.logout();
    req.flash('info', { msg: 'Your account has been deleted.' });
    res.redirect('/');
  });
};


exports.postDeleteMap = function(req, res, next) {
  let mapId = '5a3ac8952a39900309f9fdb7'; // FIXME WITH REQ

  User.findOne({ _id: req.user.id }, function(err, u) {
    if (err) { return next(err); }
    
    let mapindex = u.maps.findIndex(function(elt) {
      return elt.mapId === mapId;
    });

    let map = u.maps.find(function(elt) {
      return elt.mapId === mapId;
    });

    if (map) {
      console.log('REMOVED MAP ' + map.title);
    }

    Map.remove( {_id: mapId }, function(err, m) {
      if (err) return next(err);
    })

    // remove map
    u.maps.splice(mapindex, 1);

    u.save(function(err) {
      if (err) throw err;
    });

    req.flash('info', {msg: 'Map has been deleted'})
    res.redirect('/');
  })
}

exports.saveCreateMap = (req, res, next) => {
     if (req.body.type == "save") {
        Map.findOne({ _id: req.body.id}, function(err, m) {
            if (err) throw err;
            if (!m) {
                console.log('No map found with that ID.');
                res.send("Sorry!  No map found with that ID.");
                return;
            }
            m.data = req.body.data;
            m.title = req.body.title;

            let canEdit =   req.isAuthenticated() && 
                            ( (res.locals.user.email == m.userEmail) || (m.otherUsers && m.otherUsers.find(function(user) {
                                 return user.email === res.locals.user.email;
                               })));
            if (canEdit) {
              m.save(function(err) {
                  if (err) throw err;
              });
              console.log("Successfully saved map");
            }
            else {
              console.log("You can't do that!!!");
              res.send("No.");
            }
          });
      }
      else console.log("req.body.type should be 'save' or 'create'. req.body: " + req.body);
  };




/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = (req, res, next) => {
  const provider = req.params.provider;
  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user[provider] = undefined;
    user.tokens = user.tokens.filter(token => token.kind !== provider);
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('info', { msg: `${provider} account has been unlinked.` });
      res.redirect('/account');
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  User
    .findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
        return res.redirect('/forgot');
      }
      res.render('account/reset', {
        title: 'Password Reset'
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirm', 'Passwords must match.').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  const resetPassword = () =>
    User
      .findOne({ passwordResetToken: req.params.token })
      .where('passwordResetExpires').gt(Date.now())
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
          return res.redirect('back');
        }
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        return user.save().then(() => new Promise((resolve, reject) => {
          req.logIn(user, (err) => {
            if (err) { return reject(err); }
            resolve(user);
          });
        }));
      });

  const sendResetPasswordEmail = (user) => {
    if (!user) { return; }
    const transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
    const mailOptions = {
      to: user.email,
      from: 'hackathon@starter.com',
      subject: 'Your Hackathon Starter password has been changed',
      text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
    };
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('success', { msg: 'Success! Your password has been changed.' });
      });
  };

  resetPassword()
    .then(sendResetPasswordEmail)
    .then(() => { if (!res.finished) res.redirect('/'); })
    .catch(err => next(err));
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('account/forgot', {
    title: 'Forgot Password'
  });
};

// returns new map object
function _createMap(email) {
    // console.log('EMAIL IS: ' + email);
    return newMap;
}

// // creates new map and returns url
// function createMapURL(email) {
//     var newMap = createMapId(email);
//     var newURL = ('/maps/' + newMap._id);
//     console.log('new URL is: ' + newURL);
//     return newURL;
// }

exports.postCreateMap = (req, res, next) => {

  // NOTE: I used emailAddress here to remind myself that it's the "name" attribute in profile.pug that gets passed to req - deprecated

  User.findOne({ email: res.locals.user.email}, (err, existingUser) => {
    if (err) { 
      console.log('user.js/350');
      return next(err); 
    }
    if (existingUser) {
      var newMap = new Map ({
          data: "[{\"x\":724,\"y\":50,\"connection\":\"line\",\"data\":\"\",\"depth\":0,\"parent\":null,\"id\":0,\"permId\":0,\"children\":[{\"x\":724,\"y\":150,\"connection\":\"neoroot\",\"data\":\"Enter your text here.\",\"depth\":1,\"parent\":null,\"id\":1,\"permId\":1,\"children\":[],\"toggle\":0,\"textsize\":135.90087890625,\"subtreeWidth\":155.90087890625,\"width\":155.90087890625}],\"toggle\":0,\"textsize\":0,\"subtreeWidth\":155.90087890625,\"width\":20}]",
          userEmail: res.locals.user.email,
          title: "Untitled"
      });
      let newUrl;
      newMap.save()
        .then( (msg) => {
            console.log('MSG IS: ', msg);
            newUrl = '/maps/' + newMap._id;
            existingUser.maps.push({title: newMap.title, url: newUrl, mapId: newMap._id});
            return existingUser.save();
        })
        .then( (msg) => {
          console.log('MSG 2 IS: ', msg);
          return res.redirect(newUrl);
         })
        .catch( (e) => {
          throw e;
        });
    }
    else {
      throw('SHOULD HAVE FOUND USER - user.js. Probably a problem with req.body.emailAddress or mlab username');
    }
  });
}

// kind of a hacky fix to get around routing between exports functions
function getMapHelper(req, res, next, id, sandbox) {
    // console.log("NODE ID IS: " + req.params.nodeId);
    // console.log("URL ID IS: " + req.params.urlId);

    // for sandbox
    var idTemp = req.params.urlId;

    if (sandbox == "true") {
      idTemp = id;
    }
    // console.log('idTemp is: ' + idTemp)

    Map.findOne({ _id: idTemp}, function(err, m) {
        if (err){
          console.log("ERROR IN FINDING MAP: " + err);
        }
        if (!m) {
            console.log('No map found with that ID.');
            res.send("Sorry!  No map found with that ID.");
            return;
        }
        // console.log('CSRF SERVER: ' + res.locals._csrf);

        if (req.isAuthenticated()) {
          res.locals.headerType = 'logged';
        }
        else res.locals.headerType = 'notLogged';

        res.render('map', {
          mapId: m._id,
          mapData: JSON.parse(m.data)[0],
          _csrf: res.locals._csrf,
          nodeId: req.params.nodeId,
          sandbox: sandbox,
          mapUser: m.userEmail,
          footerType: "map",
          mapTitle: m.title
        });
      })
}

exports.getMapNode = (req, res, next) => {
   console.log("NODE");
   getMapHelper(req, res, next, 0, false);
}

exports.getMapById = (req, res, next) => {
  console.log('MAP');
  getMapHelper(req, res, next, 0, false);
}

exports.getSandbox = (req, res, next) => {
  console.log('SANDBOX')
  var idTemp = '59e1523495fd6fc832da0e5a';  // Stored map
  getMapHelper(req, res, next, idTemp, "true");
}




/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/forgot');
  }

  // DELETE THIS WHEN IMPLEMENT FORGOT PASSWORD
  else {
      req.flash('info', { msg: "This functionality is currently not supported.  Please reach out to us in the 'Contact Us' section for help at this time!" });
      return res.redirect('/forgot');
  }
  ////////////////////////////////////////////////////////////////////////
  // const createRandomToken = crypto
  //   .randomBytesAsync(16)
  //   .then(buf => buf.toString('hex'));

  // const setRandomToken = token =>
  //   User
  //     .findOne({ email: req.body.email })
  //     .then((user) => {
  //       if (!user) {
  //         req.flash('errors', { msg: 'Account with that email address does not exist.' });
  //       } else {
  //         user.passwordResetToken = token;
  //         user.passwordResetExpires = Date.now() + 3600000; // 1 hour
  //         user = user.save();
  //       }
  //       return user;
  //     });

  // const sendForgotPasswordEmail = (user) => {
  //   if (!user) { return; }
  //   const token = user.passwordResetToken;
  //   const transporter = nodemailer.createTransport({
  //     service: 'SendGrid',
  //     auth: {
  //       user: process.env.SENDGRID_USER,
  //       pass: process.env.SENDGRID_PASSWORD
  //     }
  //   });
  //   const mailOptions = {
  //     to: user.email,
  //     from: 'hackathon@starter.com',
  //     subject: 'Reset your password on Hackathon Starter',
  //     text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
  //       Please click on the following link, or paste this into your browser to complete the process:\n\n
  //       http://${req.headers.host}/reset/${token}\n\n
  //       If you did not request this, please ignore this email and your password will remain unchanged.\n`
  //   };
  //   return transporter.sendMail(mailOptions)
  //     .then(() => {
  //       req.flash('info', { msg: `An e-mail has been sent to ${user.email} with further instructions.` });
  //     });
  // };

  // createRandomToken
  //   .then(setRandomToken)
  //   .then(sendForgotPasswordEmail)
  //   .then(() => res.redirect('/forgot'))
  //   .catch(next);
};
