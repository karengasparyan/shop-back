import HttpError from 'http-errors';
import fs from 'fs';
import path from 'path';
import {v4 as uuid} from 'uuid';
import _ from 'lodash';
import Promise from 'bluebird';
import db from '../services/db';
import {
  Products, ProductAttributes, ProductImages, SidebarFilter, ProductRelations,
} from '../models';
import validate from '../services/validate';

class FilterController {

  static getPriceMinMax = async (req, res, next) => {
    try {
      let price = {};

      const min = await Products.findAll({
        order: [
          ['salePrice', 'ASC'],
        ],
      });

      const max = await Products.findAll({
        order: [
          ['salePrice', 'DESC'],
        ],
      });

      price = [min[0].price,max[0].price];

      res.send({
        status: 'ok',
        price,
      });
    } catch (e) {
      next(e);
    }
  };

  static getSidebarList = async (req, res, next) => {
    try {
      await validate(req.query, {
        page: 'numeric',
        attr: 'array',
        'attr.*': 'string',
      });
      const {attr} = req.query;

      let where = {}

      if (attr) {
        where = {attributeKey: attr}
      }

      let attributeFilter = await ProductAttributes.findAll({
        where,
      })

      attributeFilter = _.uniqBy(attributeFilter, 'attributeValue')

      res.send({
        status: 'ok',
        attributeFilter,
      });
    } catch (e) {
      next(e);
    }
  };

  static getSidebarTitles = async (req, res, next) => {
    try {
      const sidebarTitles = await SidebarFilter.findAll()

      res.send({
        status: 'ok',
        sidebarTitles,
      });
    } catch (e) {
      next(e);
    }
  };

  static createUpdateSidebarTitles = async (req, res, next) => {
    try {
      await validate(req.body, {
        titles: 'array',
        'titles.*.title': 'required|string',
      });

      const {titles} = req.body;

      let sidebarTitles = await SidebarFilter.findAll()

      const deletedTitles = _.differenceBy(sidebarTitles, titles, 'title');

      await SidebarFilter.destroy({
        where: {
          title: {$in: deletedTitles.map(d => d.title)}
        }
      })

      if (!_.isEmpty(titles)) {
        await Promise.map(titles, async (t) => (
          await SidebarFilter.findOrCreate({
            where: {title: t.title},
            defaults: {title: t.title}
          })
        ))
      }

      res.send({
        status: 'ok',
      });
    } catch (e) {
      next(e);
    }
  };

}

export default FilterController;
