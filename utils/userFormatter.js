
export const formatUserForClient = (user) => {
    if (!user) {
        return null;
    }
    // eslint-disable-next-line no-unused-vars
    const { _id, password, ...userWithoutSensitiveData } = user;
    return {
        id: _id.toHexString(),
        ...userWithoutSensitiveData
    };
};
