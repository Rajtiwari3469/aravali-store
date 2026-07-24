const { jsonRes, errRes } = require('../_lib/auth')

module.exports = async function (req, res) {
  if (req.method !== 'POST') return errRes(res, 'Method not allowed', 405)

  try {
    res.setHeader('Set-Cookie', 'aravali_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
    return jsonRes(res, { success: true })
  } catch (err) {
    return errRes(res, err.message, 500)
  }
}
