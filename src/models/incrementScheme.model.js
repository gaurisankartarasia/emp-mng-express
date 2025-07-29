import { DataTypes } from 'sequelize';

export default (sequelize) => {
  sequelize.define('IncrementScheme', {
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    level: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
  }, {
    tableName: 'increment_schemes',
  });
};