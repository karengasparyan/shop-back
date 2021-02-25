import HttpError from 'http-errors';
import fs from 'fs';
import path from 'path';
import {v4 as uuid} from 'uuid';
import _ from 'lodash';
import Promise from 'bluebird';
import db from '../services/db';
import Mail from '../services/Mail';
import {
  Products, ProductAttributes, ProductImages, SidebarFilter, ProductRelations, Orders,
} from '../models';
import validate from '../services/validate';

class CartController {

  static cartList = async (req, res, next) => {
    try {
      await validate(req.query, {
        cardIds: 'array',
        'cardIds.*': 'numeric',
      });

      let {cardIds} = req.query;

      let where = {};
      let cardProducts = [];

      if (cardIds) {
        where = {id: cardIds}

        cardProducts = await Products.findAll({
          where,
          include: {
            model: ProductAttributes,
            as: 'attribute',
            required: false,
            attributes: [],
          },
        });

        cardProducts = _.uniqBy(cardProducts, 'id')

        const attributes = await ProductAttributes.findAll({
          where: {productId: {$in: cardProducts.map(p => p.id)}}
        });

        const images = await ProductImages.findAll({
          where: {productId: {$in: cardProducts.map(p => p.id)}}
        });

        cardProducts = cardProducts.map(p => {
          p.images = images.filter(i => i.productId === p.id);
          p.attributes = attributes.filter(a => a.productId === p.id);
          p.setDataValue('attributes', p.attributes);
          p.setDataValue('images', p.images);
          return p
        });
      } else {
        cardProducts = [];
      }

      res.send({
        status: 'ok',
        cardProducts,
      });
    } catch (e) {
      next(e);
    }
  };

  static createOrder = async (req, res, next) => {
    try {
      await validate(req.body.orderData[0], {
        data: 'required|string',
      });

      await validate(req.body.orderData[1], {
        name: 'required|string',
        town: 'required|string',
        address: 'required|string',
        phone: 'required|string',
        email: 'required|string',
        total: 'required|numeric',
      });

      let {data} = req.body.orderData[0];

      const {
        name,
        town,
        address,
        phone,
        email,
        total,
      } = req.body.orderData[1];

      console.log(req.body)

      await Orders.create({
        name,
        town,
        address,
        phone,
        email,
        total,
        data,
      });

      data = JSON.parse(data)

      const id = data.map(d => d.id)

      let products = await Products.findAll({where: {id}})

      if (!products) {
        throw HttpError(422, 'Товар не существует!');
      }

      if (products) {
        await Promise.map(products, async (p) => {
          if (+p.qty - +data.find(d => +d.id === +p.id).saleCount < 0) {
            throw HttpError(422, `Извините но в складе ${p.name} только ${p.qty} товаров, измените количество покупки пожалуйста!`);
          }
          p.qty -= data.find(d => +d.id === +p.id).saleCount;
          await p.save();
        })
      }

      const {messageId} = await Mail.send(['astghik.mirijanyan@gmail.com', email], 'Order',
        `
              <div>
                <div >
                  <h2>Реквизиты</h2>
                  <div>
                    <div>
                      <h3>Имя Фамилия</h3>
                    <h4>${name}</h4>
                    </div>
                    <div>
                      <h3>Город</h3>
                      <h4>${town}</h4>
                    </div>
                    <div>
                      <h3>Адрес доставки</h3>
                      <h4>${address}</h4>
                    </div>
                    <div>
                      <h3>Телефон</h3>
                     <h4>${phone}</h4>
                    </div>
                    <div>
                      <h3>Адрес электронной почты</h3>
                      <h4>${email}</h4>
                    </div>
                  </div>
                </div>
                <div>
                  <div>
                    <h3>Заказы</h3>
                    <div>
                      <span style="font-size: 15px;">
                        ${data.map((p => p.name + '  ' + 'x  ' + p.saleCount + '  '))}
                      </span>
                      <div style="display: flex;">
                        <span style="font-size: 16px;">Обшая сумма:&nbsp;</span>
                        <span style="color: #ff3535;font-size: 16px;">₽&nbsp;</span>
                        <span style="color: #ff3535;font-size: 16px;"> ${total}</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
`)
      ;

      if (!messageId) {
        throw new HttpError(422, 'Повторите пожалуйста! Заказ не отправлено');
      }

      res.send({
        status: 'ok',
      });
    } catch (e) {
      next(e);
    }
  };

  static orderList = async (req, res, next) => {
    try {
      await validate(req.query, {
        page: 'numeric',
        s: 'string',
      });

      const {s, page = 1} = req.query;
      let limit = 5;
      const offset = (page - 1) * limit;

      let orders = await Orders.findAll({
        limit,
        offset,
        order: [
          ['id', 'DESC'],
        ],
      });

      const pageCount = await Orders.count();

      res.send({
        status: 'ok',
        orders,
        pageCount: Math.round(pageCount / limit) + 1
      });
    } catch (e) {
      next(e);
    }
  };

  static updateOrderStatus = async (req, res, next) => {
    try {
      await validate(req.body, {
        id: 'numeric',
      });

      const {id} = req.body;

      const order = await Orders.findByPk(id);

      if (!order) {
        throw new HttpError(422, 'invalid order');
      }

      if (order.status === 'completed'){
        order.status = 'pending';
      } else {
        order.status = 'completed';
      }


      await order.save();

      res.send({
        status: 'ok',
        order,
      });
    } catch (e) {
      next(e);
    }
  };

}

export default CartController;
