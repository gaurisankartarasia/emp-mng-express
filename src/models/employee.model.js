

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  sequelize.define('Employee', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true 
    },
    phone: {
      type: DataTypes.STRING,
      unique: true
    },
    picture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT
    },
    current_salary: {
        type: DataTypes.DECIMAL(10, 2)
    },
    is_master: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    joined_at: {
        type: DataTypes.DATE,
    },
    last_login: {
      type: DataTypes.DATE
    },

    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    activation_token: {
        type: DataTypes.STRING,
        allowNull: true
    },
    activation_token_expires_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
  }, {
    tableName: 'employees',
    timestamps: true
  });
};