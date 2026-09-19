const Admin = require("../../../models/Admin");
const SubAdmin = require("../../../models/SubAdmin");

const findAdminByAdminId = async (adminId) => {
  const admin = await Admin.findOne({
    admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
  });
  if (admin) return { user: admin, isSubAdmin: false };

  const subAdmin = await SubAdmin.findOne({
    admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
  });
  if (subAdmin) return { user: subAdmin, isSubAdmin: true };

  return { user: null, isSubAdmin: false };
};

const resolveAdminPrincipal = async ({ adminId, preloadedAdmin }) => {
  if (!preloadedAdmin) {
    return findAdminByAdminId(adminId);
  }

  const subAdminCheck = await SubAdmin.findOne({
    admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
  });

  if (
    subAdminCheck &&
    subAdminCheck._id.toString() === preloadedAdmin._id.toString()
  ) {
    return { user: subAdminCheck, isSubAdmin: true };
  }

  return { user: preloadedAdmin, isSubAdmin: false };
};

const sanitizeAuthenticatedAdmin = (user, isSubAdmin) => {
  const sanitizedUser = user.toObject();
  delete sanitizedUser.password;
  sanitizedUser.isTxnPassSet = !!user.txn_password;
  sanitizedUser.isSubAdmin = isSubAdmin;
  return sanitizedUser;
};

module.exports = {
  resolveAdminPrincipal,
  sanitizeAuthenticatedAdmin,
};
