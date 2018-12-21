function cube=remove_single_3D(cube,voxel_value)
% -------------------------------------------------------------------------
% Revised on 4/8/2013
% voxel_value: 
% 1: remove single isolated 1
% 0: remove single isolated 0
% NAN: remove both 1 and 0
%
% Eliminate all the single pixels: isolated "1" or "0";
% Used in Three_D_Reconstruction.m,  remove_double_3D.m
% -------------------------------------------------------------------------
% Here, define: z is up->down; y is left->right; x is back->forth 
[x,y,z]=size(cube);
pxy=zeros(x,y,1); %  up  & down
pzx=zeros(x,1,z); % left & right
pyz=zeros(1,y,z); % back & forth

flg = nargin;  % number of inputs

t=x*y*z+1;

cube_up(:,:,1)=pxy;             cube_up(:,:,2:z+1)=cube;        cube_up=cube_up(:,:,1:z);
cube_down(:,:,1:z)=cube;        cube_down(:,:,z+1)=pxy;         cube_down=cube_down(:,:,2:z+1);

cube_left(:,1,:)=pzx;           cube_left(:,2:y+1,:)=cube;      cube_left=cube_left(:,1:y,:);
cube_right(:,1:y,:)=cube;       cube_right(:,y+1,:)=pzx;        cube_right=cube_right(:,2:y+1,:);

cube_back(1,:,:)=pyz;           cube_back(2:x+1,:,:)=cube;      cube_back=cube_back(1:x,:,:);
cube_forth(1:x,:,:)=cube;       cube_forth(x+1,:,:)=pyz;        cube_forth=cube_forth(2:x+1,:,:);

if flg == 1
    
    cb=(cube-cube_up)+(cube-cube_down)+(cube-cube_left)+(cube-cube_right)+(cube-cube_back)+(cube-cube_forth);
    cb_one = abs(  ceil(  abs(cb-6)/t  ) - 1  );
    cube = cube - cb_one;
    clear cb
    cb=(cube-cube_up)+(cube-cube_down)+(cube-cube_left)+(cube-cube_right)+(cube-cube_back)+(cube-cube_forth);
    cb_one = abs(  ceil(  abs(cb+6)/t  ) - 1  );
    cube = cube + cb_one;
    
end

if flg == 2
    % (1) remove all the isolated "1" pixels:
    if voxel_value == 1
        cb=(cube-cube_up)+(cube-cube_down)+(cube-cube_left)+(cube-cube_right)+(cube-cube_back)+(cube-cube_forth);
        cb_one = abs(  ceil(  abs(cb-6)/t  ) - 1  );
        cube = cube - cb_one;
    end

    if voxel_value == 0
    % (2) remove all the isolated "0" pixels:
        cb=(cube-cube_up)+(cube-cube_down)+(cube-cube_left)+(cube-cube_right)+(cube-cube_back)+(cube-cube_forth);
        cb_one = abs(  ceil(  abs(cb+6)/t  ) - 1  );
        cube = cube + cb_one;
    end
end
