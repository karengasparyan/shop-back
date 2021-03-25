import HttpError from 'http-errors';
import fs from 'fs';
import path from 'path';
import {v4 as uuid} from 'uuid';
import _ from 'lodash';
import Promise from 'bluebird';
import Mail from '../services/Mail';
import {
  Products, ProductAttributes, ProductImages, SidebarFilter, ProductRelations, Orders,
} from '../models';
import validate from '../services/validate';
import Handlebars from "handlebars";

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

      const EmailTemplate = Handlebars.compile(`
        <h1 style="margin: 10px; color: #535353;">Реквизиты</h1>
          <table>
            <tr>
              <th style="color: #535353; font-size: 20px; padding: 5px;">Имя, фамилия</th>
              <th style="color: #535353; font-size: 20px; padding: 5px;">Город доставки</th>
              <th style="color: #535353; font-size: 20px; padding: 5px;">Адрес доставки</th>
              <th style="color: #535353; font-size: 20px; padding: 5px;">Телефонний номер</th>
              <th style="color: #535353; font-size: 20px; padding: 5px;">Электронная почта</th>
            </tr>
            <tr>
              <th style="color: #535353; font-size: 17px; padding: 5px;">${name}</th>
              <th style="color: #535353; font-size: 17px; padding: 5px;">${town}</th>
              <th style="color: #535353; font-size: 17px; padding: 5px;">${address}</th>
              <th style="color: #535353; font-size: 17px; padding: 5px;">${phone}</th>
              <th style="color: #535353; font-size: 17px; padding: 5px;">${email}</th>
            </tr>
           <h1 style="margin: 10px;color: #535353;">Заказы</h1>
           <tr>
              <th style="color: #535353; font-size: 20px; padding: 5px;">Название товара</th>
              <th style="color: #535353; font-size: 20px; padding: 5px;">Число заказов</th>
              <th style="color: #535353; font-size: 20px; padding: 5px;">Стоимость товара</th>
            </tr>
            {{#each data}}
            <tr>
              <th style="color: #535353; font-size: 17px; padding: 5px;">{{name}}</th>
              <th style="color: #535353; font-size: 17px; padding: 5px;">{{saleCount}}&nbsp;штук</th>
              <th style="color: #535353; font-size: 17px; padding: 5px;">₽&nbsp;{{salePrice}}</th>
            </tr>
            {{/each}}
            <tr>
                <th style="color: #ff3535;font-size: 24px; padding: 5px 5px;margin: 5px 5px;
                font-weight: bold;">Обшая сумма</th>
                <th></th>
                <th style="color: #ff3535;font-size: 24px; padding: 5px 5px;margin: 5px 5px;
                font-weight: bold;">₽&nbsp;${total}</th>
            </tr>
          </table>        
`);
      const template = EmailTemplate({ data: data });

      const {messageId} = await Mail.send(['astghik.mirijanyan@gmail.com', email], 'Order', template);

      if (!messageId) {
        throw new HttpError(422, 'Извините! Не удалось отправить емайл на вашу электронную почту. Мы свяжутся свами!');
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

      if (order.status === 'completed') {
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
