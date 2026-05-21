"""医院数据模型"""
from sqlalchemy import Column, String, Float
from .base import BaseModel


class Hospital(BaseModel):
    """医院信息"""
    __tablename__ = "hospitals"

    name = Column(String(200), nullable=False, comment="医院名称")
    address = Column(String(500), nullable=True, comment="地址")
    city = Column(String(100), nullable=False, comment="所在城市")
    latitude = Column(Float, nullable=True, comment="纬度")
    longitude = Column(Float, nullable=True, comment="经度")
    phone = Column(String(50), nullable=True, comment="联系电话")
    department = Column(String(200), nullable=True, comment="推荐科室")
    level = Column(String(50), nullable=True, comment="医院等级（三甲、二甲等）")
