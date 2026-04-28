import React, { useState, useCallback } from 'react';
import { Camera, Save, MapPin, Phone, X, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';

export default function ProfileView({ profile, setProfile, role }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(profile);
  
  const countryConfig: any = {
    '+91': { name: 'India', length: 10 },
    '+1': { name: 'USA', length: 10 },
    '+44': { name: 'UK', length: 10 },
    '+971': { name: 'UAE', length: 9 },
  };

  const [countryCode, setCountryCode] = useState(() => {
    if (profile.phone) {
      const matched = Object.keys(countryConfig).find(code => profile.phone.startsWith(code));
      return matched || '+91';
    }
    return '+91';
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // only digits
    const maxLength = countryConfig[countryCode]?.length || 15;
    if (value.length <= maxLength) {
      setEditForm({ ...editForm, phone: value });
    }
  };

  const handleSave = () => {
    const rawNumber = editForm.phone.replace(/\D/g, '');
    setProfile({ ...editForm, phone: `${countryCode} ${rawNumber}` });
    setIsEditing(false);
  };
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return '';
    }

    // set canvas size to match the bounding box
    canvas.width = image.width;
    canvas.height = image.height;

    ctx.drawImage(image, 0, 0);

    // extracted cropped image
    const data = ctx.getImageData(
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height
    );

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(data, 0, 0);

    return canvas.toDataURL('image/jpeg');
  };

  const showCroppedImage = async () => {
    try {
      if (imageSrc && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        setEditForm({ ...editForm, avatar: croppedImage });
        setImageSrc(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      {imageSrc && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md h-[400px] bg-bg-dark rounded-2xl overflow-hidden mb-6">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setImageSrc(null)} 
              className="bg-white/10 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white/20 transition-all"
            >
              <X size={18} /> Cancel
            </button>
            <button 
              onClick={showCroppedImage} 
              className="bg-emerald-main text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <Check size={18} /> Apply Crop
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Your <span className="text-emerald-main">Profile</span></h2>
          <p className="text-[#94a3b8] mt-1 text-sm">Manage your personal information and contact details.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => { setEditForm(profile); setIsEditing(true); }}
            className="bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/20 transition-all"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="glass p-8 rounded-2xl">
        <div className="flex flex-col md:flex-row items-start gap-8">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-full bg-emerald-main/20 border border-emerald-main/30 flex items-center justify-center text-emerald-main font-bold text-3xl overflow-hidden shrink-0">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile.name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            {isEditing && (
              <>
                <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={onFileChange} 
                  />
                </label>
              </>
            )}
          </div>

          <div className="flex-1 w-full space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-bg-dark border border-border-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">Phone Number</label>
                  <div className="flex gap-2">
                    <select 
                      value={countryCode}
                      onChange={(e) => {
                        setCountryCode(e.target.value);
                        setEditForm({ ...editForm, phone: '' }); // reset phone on country change to avoid length issues
                      }}
                      className="bg-bg-dark border border-border-main rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50 text-white"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+971">+971 (UAE)</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder={`Enter ${countryConfig[countryCode]?.length} digits`}
                      value={editForm.phone.replace(countryCode, '').trim()}
                      onChange={handlePhoneChange}
                      className="flex-1 bg-bg-dark border border-border-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50"
                    />
                  </div>
                  <p className="text-[9px] text-[#94a3b8] mt-1 italic">Limit: {countryConfig[countryCode]?.length} digits for {countryConfig[countryCode]?.name}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">Address</label>
                  <textarea 
                    value={editForm.address}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    className="w-full bg-bg-dark border border-border-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50 max-h-24"
                  />
                </div>
                {role === 'farmer' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">Total Land (Acres)</label>
                      <input 
                        type="number"
                        step="0.1" 
                        value={editForm.totalLand || ''}
                        onChange={(e) => setEditForm({...editForm, totalLand: e.target.value})}
                        className="w-full bg-bg-dark border border-border-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">Land Details (Survey No, Soil Type, etc.)</label>
                      <textarea 
                        value={editForm.landDetails || ''}
                        onChange={(e) => setEditForm({...editForm, landDetails: e.target.value})}
                        className="w-full bg-bg-dark border border-border-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50 max-h-24"
                        placeholder="Enter survey numbers, soil information..."
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-3 pt-4">
                  <button onClick={handleSave} className="flex-1 bg-emerald-main text-black py-2 rounded-lg text-xs font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                    <Save size={16} /> Save Changes
                  </button>
                  <button onClick={() => setIsEditing(false)} className="flex-1 bg-white/5 text-white py-2 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                <div>
                  <h3 className="text-2xl font-bold text-white">{profile.name || 'Unnamed User'}</h3>
                  <p className="text-emerald-main text-sm font-medium capitalize">{role} Account</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-[#94a3b8]">
                    <Phone className="w-4 h-4 text-emerald-main" />
                    <span className="text-sm">{profile.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-start gap-3 text-[#94a3b8]">
                    <MapPin className="w-4 h-4 text-emerald-main mt-0.5 shrink-0" />
                    <span className="text-sm">{profile.address || 'Not provided'}</span>
                  </div>
                  {role === 'farmer' && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-3 text-[#94a3b8]">
                        <div className="w-4 h-4 rounded-full border border-emerald-main flex items-center justify-center shrink-0" />
                        <span className="text-sm">Land Area: <span className="text-white font-semibold">{profile.totalLand || '0'} Acres</span></span>
                      </div>
                      {profile.landDetails && (
                        <div className="flex items-start gap-3 text-[#94a3b8]">
                          <div className="w-4 h-4 rounded-full border border-emerald-main flex items-center justify-center mt-1 shrink-0">
                            <div className="w-1 h-1 bg-emerald-main rounded-full" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Land Records</span>
                            <span className="text-sm whitespace-pre-wrap">{profile.landDetails}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
