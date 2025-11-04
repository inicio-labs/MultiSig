import React from "react";

const Signers = () => {
  return (
    <div className="w-full h-full ">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-dmmono font-medium text-black mb-4">
            Signers Management
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="font-dmmono font-medium text-black">
                  Add New Signer
                </h4>
                <p className="text-sm text-gray-600">
                  Add a new authorized signer to your wallet
                </p>
              </div>
              <button className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors">
                Add Signer
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-dmmono font-medium text-black">
                  Current Signers
                </h4>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-dmmono font-medium text-black">
                      Primary Signer
                    </p>
                    <p className="text-sm text-gray-600">0x1234...5678</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-dmmono font-medium text-black">
                      Secondary Signer
                    </p>
                    <p className="text-sm text-gray-600">0x9876...4321</p>
                  </div>
                  <button className="text-red-500 hover:text-red-700 text-sm">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signers;
