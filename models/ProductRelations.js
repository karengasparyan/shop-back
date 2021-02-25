import { Model, DataTypes } from 'sequelize';
import db from '../services/db';
import ProductImages from "./ProductImages";
import Products from "./Products";

class ProductRelations extends Model {

}

ProductRelations.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
}, {
  sequelize: db,
  modelName: 'productRelations',
  tableName: 'productRelations',
});


Products.belongsToMany(Products, {
  onDelete: 'cascade',
  onUpdate: 'cascade',
  as: 'relatedProducts',
  through: ProductRelations,
});

export default ProductRelations;
