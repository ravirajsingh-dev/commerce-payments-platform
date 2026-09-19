/**
 * Check validation and return massage
 * @path {Object} form name of the package
 * @path {ArrayObject} requireFields type of the script
 */
export const validateForm = (form, requireFields) => {
  const errors = [];
  for (let i in requireFields) {
    if (requireFields[i].type === "object") {
      if (!form[requireFields[i].path][requireFields[i].value].trim().length) {
        errors.push({
          path: requireFields[i].path,
          msg: requireFields[i].msg,
        });
      }
    } else if (requireFields[i].type === "array") {
      if (!form[requireFields[i].path].length) {
        errors.push({
          path: requireFields[i].path,
          msg: requireFields[i].msg,
        });
      }
    } else if (requireFields[i].type === "number") {
      if (isNaN(form[requireFields[i].path])) {
        errors.push({
          path: requireFields[i].path,
          msg: requireFields[i].msg,
        });
      }
    } else if (requireFields[i].validator) {
      const value = form[requireFields[i].path];
      if (!requireFields[i].validator(value)) {
        errors.push({
          path: requireFields[i].actualParam || requireFields[i].path,
          msg: requireFields[i].msg,
        });
      }
    } else if (requireFields[i].cond) {
      const trimData = requireFields[i].value.trim();
      if (!requireFields[i].cond(trimData)) {
        errors.push({
          path: requireFields[i].actualParam || requireFields[i].path,
          msg: requireFields[i].msg,
        });
      }
    } else if (
      !form[requireFields[i].path].toString().length ||
      !form[requireFields[i].path].toString().trim().length
    ) {
      errors.push({
        path: requireFields[i].actualParam || requireFields[i].path,
        msg: requireFields[i].msg,
      });
    }
  }
  if (errors.length) {
    return errors;
  }
  return errors;
};
