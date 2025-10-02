async function assignRole(member, roleId) {
  try {
    await member.roles.add(roleId);
    return true;
  } catch (error) {
    console.error('Role assignment error:', error.message);
    return false;
  }
}

async function removeRole(member, roleId) {
  try {
    await member.roles.remove(roleId);
    return true;
  } catch (error) {
    console.error('Role removal error:', error.message);
    return false;
  }
}

module.exports = { assignRole, removeRole };
