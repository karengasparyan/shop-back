import { Model, DataTypes } from 'sequelize';
import db from '../services/db';

class SliderImages extends Model {

}

SliderImages.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  sequelize: db,
  modelName: 'sliderImages',
  tableName: 'sliderImages',
});

export default SliderImages;
