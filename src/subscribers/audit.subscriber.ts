import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from "typeorm";
import { BaseEntity } from "../entities";
import { RequestContext } from "../interceptors";

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<BaseEntity> {
  listenTo() {
    return BaseEntity;
  }

  beforeInsert(event: InsertEvent<BaseEntity>) {
    event.entity.createdBy ??= RequestContext.userId;
  }

  beforeUpdate(event: UpdateEvent<BaseEntity>) {
    if (!event.entity) return;

    event.entity.updatedBy = RequestContext.userId;
  }
}
