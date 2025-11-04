import React from "react";

const Transactionguard = () => {
  return (
    <div className="w-full h-full ">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-dmmono font-medium text-black mb-4">
            Transaction Guard Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="font-dmmono font-medium text-black">
                  Transaction Limits
                </h4>
                <p className="text-sm text-gray-600">
                  Set maximum transaction amounts
                </p>
              </div>
              <button className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors">
                Configure
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="font-dmmono font-medium text-black">
                  Suspicious Activity Detection
                </h4>
                <p className="text-sm text-gray-600">
                  Automatically flag suspicious transactions
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  defaultChecked
                  className="mr-2 h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">Enabled</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="font-dmmono font-medium text-black">
                  Multi-Signature Requirements
                </h4>
                <p className="text-sm text-gray-600">
                  Require multiple signatures for large transactions
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  defaultChecked
                  className="mr-2 h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">Enabled</span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-dmmono font-medium text-black">
                  Blocked Addresses
                </h4>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-gray-600">0xabcd...efgh</p>
                    <p className="text-xs text-gray-500">Added on 2024-01-15</p>
                  </div>
                  <button className="text-red-500 hover:text-red-700 text-sm">
                    Remove
                  </button>
                </div>
                <button className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">
                  + Add Blocked Address
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactionguard;
