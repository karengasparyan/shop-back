import { Model, DataTypes } from 'sequelize';
import db from '../services/db';
import ProductRelations from "./ProductRelations";
import Products from "./Products";

class ProductAttributes extends Model {

}

ProductAttributes.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  attributeKey: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  attributeValue: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  sequelize: db,
  modelName: 'productAttributes',
  tableName: 'productAttributes',
});


ProductAttributes.belongsTo(Products, {
  onDelete: 'cascade',
  onUpdate: 'cascade',
  foreignKey: 'productId',
  as: 'products',
});

Products.hasMany(ProductAttributes, {
  onDelete: 'cascade',
  onUpdate: 'cascade',
  foreignKey: 'productId',
  as: 'attributes',
});

Products.hasOne(ProductAttributes, {
  onDelete: 'cascade',
  onUpdate: 'cascade',
  foreignKey: 'productId',
  as: 'attribute',
});

export default ProductAttributes;
