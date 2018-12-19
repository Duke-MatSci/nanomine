% Smaller bulk generation 
% Xiaolin Li
% Randomly select smaller bulks from a larger bulk. The VF has to be
% simillar to the original VF

clear all;
clc;
file = '300_100_60';
loadpath = './Fine_coarse/Coarse/';
savepath = strcat(loadpath,file,'/');
mkdir(savepath);
load(strcat(loadpath ,file ,'.mat'));
L = length(Bimg_coarse(1,1,:));

VF = sum(Bimg_coarse(:))/L^3;
unit_l = 20;
sampling_num = 25;
tolerance = 5; %in percent
counter = 0;


while counter < sampling_num
    xs = unidrnd(L - unit_l + 1, 1, 3);
    Bimg_local = Bimg_coarse(xs(1):xs(1)+unit_l-1, xs(2):xs(2)+unit_l-1, xs(3):xs(3)+unit_l-1 );
    VF_prime = sum(Bimg_local(:))/unit_l^3;
    if abs(VF - VF_prime)/VF <= tolerance/100
        save_file = strcat(file, '_', int2str(counter+1),'_',date);
        save(strcat(savepath, save_file), 'Bimg_local', 'VF','xs');
        counter = counter + 1;
    end
end