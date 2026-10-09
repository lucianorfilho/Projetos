from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Usuario, EventoConfig, RoleEnum
from app.schemas import EventoConfigResponse, EventoConfigUpdate
from app.dependencies import get_current_user

router = APIRouter(prefix="/evento", tags=["evento"])


@router.get("/config", response_model=EventoConfigResponse)
def get_evento_config(db: Session = Depends(get_db)):
    config = db.query(EventoConfig).first()
    if not config:
        config = EventoConfig(codigo_acesso_ativo="EVENTO2024")
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.patch("/config", response_model=EventoConfigResponse)
def update_evento_config(
    config_update: EventoConfigUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    config = db.query(EventoConfig).first()
    if not config:
        config = EventoConfig(codigo_acesso_ativo=config_update.codigo_acesso_ativo)
        db.add(config)
    else:
        config.codigo_acesso_ativo = config_update.codigo_acesso_ativo

    db.commit()
    db.refresh(config)
    return config
