import { actor } from '../middleware/auth.middleware';
import type { Kind } from '../models/crm.models';
import * as service from '../services/record.service';
import { asyncHandler, success } from '../utils/http';
import { dto } from '../utils/dto';
import { idParams, listSchema } from '../validators/schemas';
export function recordController(kind: Kind) {
  return {
    list: asyncHandler(async (req, res) => { const result = await service.listRecords(kind, listSchema.parse(req.query), actor(req)); return res.json({ success: true, ...result }); }),
    get: asyncHandler(async (req, res) => success(res, dto(await service.getRecord(kind, idParams.parse(req.params).id, actor(req))))),
    create: asyncHandler(async (req, res) => success(res, dto(await service.writeRecord(kind, null, req.body, actor(req))), 'Record created', 201)),
    update: asyncHandler(async (req, res) => success(res, dto(await service.writeRecord(kind, idParams.parse(req.params).id, req.body, actor(req))), 'Record updated')),
    remove: asyncHandler(async (req, res) => { await service.deleteRecord(kind, idParams.parse(req.params).id, actor(req)); return success(res, null, 'Record deleted'); }),
  };
}
