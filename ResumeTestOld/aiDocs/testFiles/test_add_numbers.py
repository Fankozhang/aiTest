import sys
import os

# 添加父目录到Python路径以便导入模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
from add_numbers import add_numbers

class TestAddNumbers(unittest.TestCase):
    """测试add_numbers函数"""

    def test_add_positive_numbers(self):
        """测试正数相加"""
        self.assertEqual(add_numbers(1, 1), 2)
        self.assertEqual(add_numbers(5, 3), 8)
        self.assertEqual(add_numbers(10, 20), 30)

    def test_add_zero(self):
        """测试添加零"""
        self.assertEqual(add_numbers(0, 0), 0)
        self.assertEqual(add_numbers(5, 0), 5)
        self.assertEqual(add_numbers(0, 7), 7)

    def test_add_negative_numbers(self):
        """测试负数相加"""
        self.assertEqual(add_numbers(-1, -1), -2)
        self.assertEqual(add_numbers(-5, 3), -2)
        self.assertEqual(add_numbers(10, -3), 7)

if __name__ == "__main__":
    unittest.main()
