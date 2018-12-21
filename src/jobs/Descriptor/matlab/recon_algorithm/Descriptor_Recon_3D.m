% Descriptor-based 3D reconstruction, version I
% Version I is much faster than II, because it only compute the necessary
% parts (neighbor relations), instead of full point set evaluation in
% Re-evaluations.
%
% Biphase, particle/agglomerate-based microstructure
% Descriptor-used: VF, cluster number, radius, nearest distance, 
% aspect ratio, orientation
%
% Definition for the descriptors (INPUTS):
% L, cube size (not microstructure descriptor)
% VF
% Cluster number, N
% Radius: r, overlap with N. This is for capture the distribution info
% Nearest distance, nd. This is just a average value now
% Aspect ratio, ar. For a 3D ellipsoid, Assume a ~= b = c (1). 
% a, b, c is the axis length
% Orientation, A, B, C
% A, B, C: the rotation angle around X, Y, Z axis
% Based on Assume (1), rotation angles, A = 0; B, C ~= 0
% -------------------------------------------------------------------------
% Subfunction used:
% find_nearest_neighbor_3D.m (Actually it is not used)
% remove_single_3D.m
% find_edge_1_3D.m
% find_edge_0_3D.m
% ThreeD2Coordinate.m (for visualization) 
% voxel_image.m (for visualization)
% -------------------------------------------------------------------------
% name = 'Recon_8_330-60-50_007.mat'
function Descriptor_Recon_3D(name, L, VF, N, ndt, As_m, As_v)
% clear
% clc
%% Input part
PBC = 0; % 1 -- PBC is applied; 0 -- PBC is not applied

% General:
% L = 300;  % side length
% VF = 0.233; % 0.1758; 
% % For Part I:
% N = 13895; % particle number
% % N = round( 240*L/14.7 ); % 14.7 is the pixel size of scan depth: 175 nm
% 
% ndt = [  0.1325   0.4026    0.6866    0.8677    0.9386    0.9713 ]; % nd <3; <5; <7.5; <10; <12.5; <15, get from the 300X300 image patch

% For Part II:
% They are located at the beginning of Setp II
L = L + 10;
%% Notification
% The order or following vectors/matrix should be synchronized:
% xl, yl, zl, img, No, cl = [xl yl zl], nd

%% STEP 1: Generate a random particle center map

% ---------------------- Option I: total random ---------------------------
img = zeros(L, L, L, 'int16'); % 23767 particle centers at most
xl = zeros(N,1);
yl = zeros(N,1);
zl = zeros(N,1);
No = zeros(N,1); % the Number list of all the points

ii = 1;
while ii <= N
    
    x = rand()*( L - 10 ) + 5; x = round(x);
    y = rand()*( L - 10 ) + 5; y = round(y);
    z = rand()*( L - 10 ) + 5; z = round(z);
    
    if sum(  sum(  sum( img( x-1:x+1 , y-1:y+1 , z-1:z+1 ) )  )  ) == 0
        img(x,y,z) = ii;
        xl(ii) = x;
        yl(ii) = y;
        zl(ii) = z;
        No(ii) = ii;
        ii = ii + 1;
    end
    
end
clear ii x y z 
% Get "img", a COLOR center map
% -------------------------------------------------------------------------


% --------------------- Option II: real 2D piles --------------------------
% load centermap_p300 % centermap_p300  % load in real 2D's center map "centermap_p"
% centermap_p = centermap_p(1:L , 1:L);
% n = sum(sum(centermap_p));
% 
% % interval = floor( L/( N/n ) );
% interval = floor(ndmean);
% 
% img = zeros(L, L, L, 'int16'); % 23767 particle centers at most
% 
% for ii = 1:interval:L
%     k = rand(); k = ceil(k*4);
%     temp_map = rot90(centermap_p,k);
%     img(:,:,ii) = int16( temp_map );
% end
% [xl, yl, zl] = ind2sub( size(img),find(img ~= 0) );
% 
% cpn = length(xl);  % current particle number
% 
% if cpn > N
%     
%     current_order = randperm(cpn);
%     for ii = 1:1:cpn-N
%         x = xl( current_order(ii) );
%         y = yl( current_order(ii) );
%         z = zl( current_order(ii) );
%         img(x,y,z) = 0;
%     end
%     [xl, yl, zl] = ind2sub( size(img),find(img ~= 0) );
%     
% elseif cpn < N
%     
%     ii = cpn + 1;
%     
%     pre_layer_no = 1:interval:L;
%     
%     while ii <= N
%         x = rand()*( L - 10 ) + 5; x = round(x);
%         y = rand()*( L - 10 ) + 5; y = round(y);
%         z = rand()*( L - 10 ) + 5; z = round(z);
%         
%         flg = abs( pre_layer_no - z );
%         flg = prod(flg);
%         
%         if sum(  sum(  sum( img( x-1:x+1 , y-1:y+1 , z-1:z+1 ) )  )  ) == 0 && flg
%             img(x,y,z) = 1;
%             xl(ii) = x;
%             yl(ii) = y;
%             zl(ii) = z;
%             ii = ii + 1;
%         end
%     end
%     clear ii x y z 
% 
% end
% 
% 
% clear  ii  n  interval  temp_map  cpn  pre_layer_no  flg
% -------------------------------------------------------------------------

%% Adjust the nearest distances
cl = [ xl, yl, zl ];  % Coordinate list

nd = zeros(N,1); % Initialize nd

% Evaluate the nearest distance for the first time
% matlabpool open 2;

parfor ii = 1:N
    if mod(N-ii,1000) == 0
        disp(N-ii)
    end
    if PBC == 0
        expand_c = repmat( cl(ii,:) , [N , 1] );
        distances = (cl - expand_c).^2;
        distances = sum( distances , 2);
        distances = distances.^0.5;
    elseif PBC == 1
        distances = PBC_distance(cl, L-10, ii);
    end
    distances = sort(distances,'ascend');
    nd(ii) = distances(2);
%     disp(ii);    
%     [No, ndt] = find_nearest_neighbor_3D(xl(ii), yl(ii), zl(ii), img, L);
%     nd(ii) = ndt;
%     nnno(ii) = No; 

end

% matlabpool close;

% Start Simulated Annealing
disp('start simulated annealing I: adjust center locations')
T = 200;
Pr = 0.35;
disp(['The no. of cluster in 3D is',num2str(N)])
nd_old = nd;

% Start EVALUATION
% % Evaluation option 1: nd_mean
% nd_oldmean = mean(nd);
% nd_newmean = nd_oldmean;
% Evaluation option 2: nd_frequencies
EV0 = nd<3; EV1 = nd<5; EV2 = nd<7.5; EV3 = nd<10; EV4 = nd<12.5; EV5 = nd<15;
nd_oldEV = [ sum(EV0), sum(EV1), sum(EV2), sum(EV3), sum(EV4), sum(EV5) ]/N;
nd_newEV = nd_oldEV;


% Updation List:
% img, xl, yl, zl, cl, nd_oldmean, nd_newmean, 

% -------- Controls how far the particle center from boundaries -----------
MarginWidth = 1;
% -------------------------------------------------------------------------
iter_num = 1;
max_iter  = 1;
while iter_num < max_iter  % T: change from 200 -> 0 // Do it till tolerance limit
    
    tic;
    move_order = randperm(N);
    
    for ii = 1:1:N  % Loop over all points
%         tic;
        
        if mod(N-ii,1000) == 0
            disp(N-ii);
        end
        
        % Get old location (x, y, z)
        num = move_order(ii);
        x = xl(num);
        y = yl(num);
        z = zl(num);
            
        while 1  % Get new location (x_new, y_new, z_new)
            
            % Here can change the jump length for random moving
            x_move = ceil( -15 + 30*rand() );
            y_move = ceil( -15 + 30*rand() );
            z_move = ceil( -15 + 30*rand() );
            
            x_new = x + x_move;
            y_new = y + y_move;
            z_new = z + z_move;
            
            % Apply PERIODICAL BOUNDARY CONDITION

            if x_new > L
                x_new = x_new - L;
            end
            if x_new < 1
                x_new = x_new + L;
            end

            if y_new > L
                y_new = y_new - L;
            end
            if y_new < 1
                y_new = y_new + L;
            end

            if z_new > L
                z_new = z_new - L;
            end
            if z_new < 1
                z_new = z_new + L;
            end

            if ( x_new>1+MarginWidth ) && ( x_new<L-MarginWidth )  && ...
                    ( y_new>1+MarginWidth ) && ( y_new<L-MarginWidth )  && ...
                    ( z_new>1+MarginWidth ) && ( z_new<L-MarginWidth )  && ...
                    ( sum(sum(sum( img( x_new-1:x_new+1, y_new-1:y_new+1, z_new-1:z_new+1 ) ) ) )== 0 )
                break
            end
            
        end
        
        % Before moving, see (x, y, z) to all points distance, which is
        % already the nearest distance
        if PBC == 0
            expand_c = repmat( cl(num,:) , [N , 1] );
            old_all_dist = (cl - expand_c).^2;  % OLD location to ALL points' DISTANCE 
            old_all_dist = sum( old_all_dist , 2);
            old_all_dist = old_all_dist.^0.5;
            clear expand_c
        
           % indi1 = find(old_all_dist == nd);
        elseif PBC == 1
            old_all_dist = PBC_distance(cl,L-10,num);
            
        end
        indi1 = find(old_all_dist == nd);
        
        % Moving (update img, xl, yl, zl, cl)
        img(x_new, y_new, z_new) = img(x,y,z);
        img(x,y,z) = 0;
        xl(num) = x_new;
        yl(num) = y_new;
        zl(num) = z_new;
        cl(num,1) = x_new;
        cl(num,2) = y_new;
        cl(num,3) = z_new;
        
        
        for jj = 1:1:length(indi1)
            temp_num = indi1(jj);
            % ----------------- Method 1, matrix compute ------------------
            if PBC == 0
                expand_c = repmat( cl(temp_num,:) , [N , 1] );
                distances = (cl - expand_c).^2;
                distances = sum( distances , 2);
                distances = distances.^0.5;
            elseif PBC == 1
                distances = PBC_distance(cl, L-10, temp_num);
            end
            distances = sort(distances,'ascend');
            nd(temp_num) = distances(2);
            % Tests indicate that Method 1 is better than Method 2
            % -------------------------------------------------------------
            % ----------------- Method 2, neighbor search -----------------
%             [~, temp_nd] = find_nearest_neighbor_3D(xl(temp_num), yl(temp_num), zl(temp_num), img, L);
%             nd(temp_num) = temp_nd;
            % -------------------------------------------------------------
        end
        clear indi temp_num temp_nd
        
        % After moving:
        if PBC == 0
            expand_c = repmat( cl(num,:) , [N , 1] );
            new_all_dist = (cl - expand_c).^2;  % NEW location to ALL points' DISTANCE 
            new_all_dist = sum( new_all_dist , 2);
            new_all_dist = new_all_dist.^0.5;
            clear expand_c
        elseif PBC == 1
            new_all_dist = PBC_distance(cl,L-10, num);
        end
        indi2 = (new_all_dist < nd); % 0-1 matrix indicate where in 'nd' should be changed
        nd = new_all_dist .* indi2 + nd .* (1-indi2);
        
        temp_new_all_dist = sort(new_all_dist, 'ascend'); 
        nd(num) = temp_new_all_dist(2);
        clear temp_new_all_dist
        
        
        % EVALUATION
%         % Evaluation option 1: nd_mean
%         nd_newmean = mean(nd);
        % Evaluation option 2: nd frequencies
        EV0 = nd<3; EV1 = nd<5; EV2 = nd<7.5; EV3 = nd<10; EV4 = nd<12.5; EV5 = nd<15;
        nd_newEV = [ sum(EV0), sum(EV1), sum(EV2), sum(EV3), sum(EV4), sum(EV5) ]/N;
        
        
        % If better, accept; if worse, accept with a given Pr.        
        if sum( abs( nd_newEV - ndt ) ) < sum( abs( nd_oldEV - ndt ) )  % if better
            % Update: update coordinate list
            nd_old = nd;
            nd_oldEV = nd_newEV;  % Evaluation option 1: nd_mean
        else  % if worse
            flag = rand();
            if flag < Pr  % accept the bad with certain Pr
                % Update: update coordinate list
                nd_oldEV = nd_newEV;  % Evaluation option 1: nd_mean
            else  % NOT accept
                % restore img
                img(x,y,z) = img(x_new, y_new, z_new);
                img(x_new, y_new, z_new) = 0;
                % restore nd
                nd = nd_old;
                % restore xl, yl, zl
                xl(num) = x;
                yl(num) = y;
                zl(num) = z;
                % restore cl
                cl(num,1) = x;
                cl(num,2) = y;
                cl(num,3) = z;
            end
        end
        
%         toc;
    end
    if (T > 1) 
        T = T - 1;
        Pr = Pr - (200-T)*Pr/200;
    end
    
    disp(T);
    disp(Pr);
    fprintf('iteration number = %d.\n',iter_num);
    iter_num = iter_num + 1;
%     disp( nd_oldmean );
    disp( sum(abs( nd_newEV - ndt )) );
%     disp( [ nd_oldmean  mean(nd)  sum(sum(sum(img))) ] );
    toc;
    
    if sum( abs( nd_newEV - ndt ) ) < 0.005
        break
    end
    
    
end

img = int8( ceil( double(img)/(N+1) ) );
clear  xl  yl  zl  T  nd_oldmean  nd_newmean  nd_old  Pr  x  y  z  ii  jj MarginWidth
% Actually img is not used in following parts. Only use cl.
clear  img

%% STEP II-1: Inputs and Generation of Volumes (Radius), Aspect Ratio & Orientation

disp('Now assigning volume, aspect ration and orientation for each particle/aggregate/cluster...')

% (1) --------------------- Volume of each particle -----------------------
% % ............ Gaussian distribution of particle volumes ................
% Area_m = L^2*VF/N;
% Area_v = Area_m/10;
% areas = randn([N,1]);
% areas = areas*Area_v + Area_m;
% % .......................................................................

% % ............. Uniform distribution of particle volumes ................
% volume_m = L^3*VF/N;
% volumes = rand([N,1]);
% volumes = volumes * volumes/mean(volumes);
% % .......................................................................

% .......... Exponential distribution of particle volumes ...............
mu = L^3*VF/N;
volumes = exprnd(mu,[N,1]);
% .......................................................................

% % .................... All the same particle volumes ....................
% volumes = ones(N,1) * L^3*VF/N;
% % .......................................................................

ng = find(volumes < 0);  % ng: negative values
if ng>0
    for ii = 1:1:length(ng)
        volumes( ng(ii) ) = 1;  % use 1 to replace the negative value. The min bias
    end
end

% bg = find(volumes > 2680);  % ng: upper bound from observation
% if bg>0
%     for ii = 1:1:length(bg)
%         volumes( bg(ii) ) = 2680;  % use upper bound to replace the negative value. The min bias
%     end
% end
clear ng bg
% -------------------------------------------------------------------------

% ----------------- (2) Aspect ratio of each particle ---------------------
% As_m =  1.6909;
% As_v =  0.1871;

aspects = randn([N,1]);
aspects = aspects*As_v + As_m;
ng = find(aspects < 1);  % ng: negative values
if ng>0
    for ii = 1:1:length(ng)
        aspects( ng(ii) ) = 1;  % use 1 to replace the negative value. The min bias
    end
end

% % if there is a upper bound for aspect ratio
% upper_as = 3; % Upper bound of aspect ratio
% bg = find(aspects > upper_as);  % ng: negative values
% if bg>0
%     for ii = 1:1:length(bg)
%         aspects( bg(ii) ) = upper_as;  % use 1 to replace the negative value. The min bias
%     end
% end
clear ng bg
% -------------------------------------------------------------------------
% 
% % For debugging the aspect ratio part
% aspects = ones([N,1]); 
% aspects = 3*aspects;

% (3) ----------- Orientation of each particle's major axis ---------------
% Suppose the major axis is on x-axis at the beginning, then it is rotated
% around y-axis and z-axis to gain the orientation. 
% A = 0;
B = rand([N,1]); 
B = B*180; B = B/180*pi;
C = B;
A = B;
% Rotation matrix:
% A = A/180*pi;
% B = B/180*pi;
% C = C/180*pi;
% Rx = [
%     1,  0,      0 
%     0,  cos(A), -sin(A) 
%     0,  sin(A),  cos(A)
%     ];
% Ry = [
%     cos(B) , 0,  sin(B) 
%     0,       1,  0
%     -sin(B), 0,  cos(B)
%     ];
% Rz = [
%     cos(C), -sin(C),  0
%     sin(C),  cos(C),  0
%          0,       0,  1
%     ];
% -------------------------------------------------------------------------

%% STEP II-2: Generate particle geometry and put into the 3D image
disp('Now generating cluster realizations...')

% Determine the canvas size for single particle image
volumes_max = max(volumes);
R_max = (volumes_max*0.75/pi) ^ (1/3);  % The maximum radius
sis = 2 * R_max * max(aspects);  % sis is s_i's canvas side length. 's_i': single image
sis = ceil(sis);
if mod(sis,2) == 0
    sis = sis + 5;
else
    sis = sis + 4;
end
% sis is a odd number

% The center point of single particle image's canvas
cpx = (sis+1)/2;
cpy = cpx;
cpz = cpx;

% Generate temp_img
temp_img = int8( zeros(L+sis, L+sis, L+sis) );

volume_sum = 0;
% volume of ellipsoid: (4/3)*pi*a*b*c

% SIS_REC = {};

for ii = 1:1:N
    if mod(ii,50) == 0
        disp(N-ii);
    end
    
    s_i = zeros( sis, sis, sis );  % s_i: single image
    s_v = volumes(ii);
    s_as = aspects(ii);
    
    s_y = ( s_v*3/(pi*4*s_as) )^(1/3);
    s_z = s_y;
    s_x = s_y * s_as;  % Single particle's x length (the major axis)
    
    % The coordinate lists
    s_xl = [];
    s_yl = [];
    s_zl = [];
    
    for x = (cpx - ceil(s_x) ):1:(cpx + ceil(s_x) )
        for y = (cpy - ceil(s_y) ):1:(cpy + ceil(s_y) )
            for z = (cpz - ceil(s_z) ):1:(cpz + ceil(s_z) )
                if ( ( x - cpx ) / s_x )^2 + ( ( y - cpy ) / s_y )^2 + ( ( z - cpz ) / s_z )^2 <= 1
                    s_i(x,y,z) = 1;
                    s_xl = [ s_xl; x ];
                    s_yl = [ s_yl; y ];
                    s_zl = [ s_zl; z ];
                end
            end
        end
    end
        
    % adjust the (0,0)point to the center
    tc = [s_xl s_yl s_zl];  % temp coordinate
    tc = tc - cpx;  % Here, we take the fact that cpx = cpy = cpz
    
    % Rotation
    angleY = B(ii);
    angleZ = C(ii);
    Ry = [
        cos(angleY) , 0,  sin(angleY) 
        0,            1,  0
        -sin(angleY), 0,  cos(angleY)
        ];
    Rz = [
        cos(angleZ),  -sin(angleZ),  0
        sin(angleZ),  cos(angleZ) ,  0
        0,            0           ,  1
        ];
    tc = tc * Ry * Rz;  % Rotation
    tc = tc + cpx;  % Here, we take the fact that cpx = cpy = cpz
    tc = floor(tc);
    clear angleY angleZ Ry Rz
    
    s_i = zeros( sis, sis, sis );
    for jj = 1:1:size(tc,1)
        s_i( tc(jj,1) , tc(jj,2), tc(jj,3) ) = 1;
    end
    s_i = remove_single_3D(s_i,0);  % Just remove all the isolated single '0' pixels
    
    % For examining results, can be deleted to save memory
%     SIS_REC{ii} = s_i;
    
    volume_sum = volume_sum + sum(sum(sum(s_i)));  % For checking VF
    
    % Put this particle into img
    x = cl(ii,1);
    y = cl(ii,2);
    z = cl(ii,3);
    temp_img( x:x+sis-1 , y:y+sis-1 , z:z+sis-1 ) = temp_img( x:x+sis-1 , y:y+sis-1 , z:z+sis-1 ) + int8(s_i);
    
end
if PBC == 0
    temp_img = temp_img( cpx : L+cpx-1 , cpx : L+cpx-1 , cpx : L+cpx-1);  % Here, we take the fact that cpx = cpy = cpz
    temp_img = (temp_img ~= 0);
elseif PBC == 1
    temp_img = PBC_integrate(temp_img, L-10, cpx);
    temp_img = (temp_img ~=0);
end

clear  x  y  sis  tc  ii  jj  cpx  cpy  cpz  tc
clear  s_i  s_v  s_as  s_xl  s_yl  s_zl  s_x  s_y  s_z

%% Final adjustment: add/substract boundary voxels for VF compensation
temp_img = remove_single_3D(temp_img); 
if PBC == 0
    L = L - 10;
    temp_img = temp_img( 6:L+5, 6:L+5, 6:L+5 );
elseif PBC ==1
    L = L - 10;
end

AN = VF*L^3 - sum(sum(sum(temp_img)));  % AN: add number

if AN > 0  % Need add "1" voxels
    
    cnt = 0;
    flg = 0;
    while 1
        
        C = find_edge_0_3D(temp_img);
        no_list = randperm( size(C,1) );
        
        for ii = 1:1:size(C,1)
            
            no = no_list(ii);
            x = C(no,1);
            y = C(no,2);
            z = C(no,3);
            temp_img(x,y,z) = 1;
            cnt = cnt + 1;
            
            if cnt >= AN
                flg = 1;
                break;
            end
            
        end
        
        if flg
            break;
        end
        
    end
    
else  % Need add "0" voxels
    
    AN = abs(AN);   
    cnt = 0;
    flg = 0;
    while 1
        
        C = find_edge_1_3D(temp_img);
        no_list = randperm( size(C,1) );
        
        for ii = 1:1:size(C,1)
            
            no = no_list(ii);
            x = C(no,1);
            y = C(no,2);
            z = C(no,3);
            temp_img(x,y,z) = 0;
            cnt = cnt + 1;
            
            if cnt >= AN
                flg = 1;
                break;
            end
        end
        
        if flg
            break;
        end

    end
    
end

img = temp_img;  % img is the final product

clear temp_img
clear cnt flg

save([name, '.mat'], 'img')
save([name, '_center_list.mat'], 'cl')
