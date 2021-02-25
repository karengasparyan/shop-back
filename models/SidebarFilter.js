import { Model, DataTypes } from 'sequelize';
import db from '../services/db';

class SidebarFilter extends Model {

}

SidebarFilter.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  sequelize: db,
  modelName: 'sidebarFilter',
  tableName: 'sidebarFilter',
});



export default SidebarFilter;
