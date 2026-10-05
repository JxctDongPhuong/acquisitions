export const cookies = {
  getOption: () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  }),

  set: (res, name, value, option = {}) => {
    res.cookie(name, value, { ...cookies.getOption(), ...option });
  },

  clear: (res, name, option = {}) => {
    res.clearCookie(name, { ...cookies.getOption(), ...option });
  },

  get: (req, name) => {
    return req.cookies?.[name];
  },
};
